import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateGiftsForOrder } from '@/services/gift-promotion.service';
import { maskPhone, shortAddress } from '@/lib/pii-masking';

const orderAdminInclude = {
  items: { include: { product: true } },
  promoCode: true,
  shippingInfo: true,
} as const;

/** Get order by id (minimal, for webhook). */
export async function findOrderForWebhook(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, yookassaPaymentId: true },
  });
}

/** Get order with shipping for CDEK flow. */
export async function findOrderWithShipping(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      cdekOrderUuid: true,
      cdekTrackNumber: true,
      shippingInfo: { select: { deliveryMethod: true } },
    },
  });
}

/** Get order with items and shipping for CDEK createCdekOrder. */
export async function findOrderWithItemsAndShippingForCdek(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      shippingInfo: true,
    },
  });
}

/** Get order by id for admin CDEK shipment. */
export async function findOrderForCdekShipment(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      cdekOrderUuid: true,
      cdekTrackNumber: true,
      shippingInfo: { select: { deliveryMethod: true } },
    },
  });
}

export interface AdminOrderDto {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  userId: string | null;
  promoCodeId: string | null;
  promoCode: {
    code: string;
  } | null;
  shippingInfo: {
    fullName: string;
    phoneMasked: string;
    phoneRaw: string;
    city: string;
    addressShort: string;
    deliveryMethod?: string | null;
  } | null;
}

/** Get all orders for admin list with masked PII. */
export async function getOrdersForAdmin(): Promise<AdminOrderDto[]> {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null },
    include: orderAdminInclude,
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((order) => ({
    id: order.id,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    userId: order.userId ?? null,
    promoCodeId: order.promoCodeId ?? null,
    promoCode: order.promoCode ? { code: order.promoCode.code } : null,
    shippingInfo: order.shippingInfo
      ? {
          fullName: order.shippingInfo.fullName,
          phoneMasked: maskPhone(order.shippingInfo.phone),
          phoneRaw: order.shippingInfo.phone,
          city: order.shippingInfo.city,
          addressShort: shortAddress(order.shippingInfo.address, order.shippingInfo.city),
          deliveryMethod: order.shippingInfo.deliveryMethod ?? null,
        }
      : null,
  }));
}

export interface AdminOrderWithDeletedDto extends AdminOrderDto {
  deletedAt: string | null;
}

/** Get orders for admin with optional trash filter. */
export async function getOrdersForAdminWithTrash(options: {
  mode: 'active' | 'trash';
}): Promise<AdminOrderWithDeletedDto[]> {
  const where: Prisma.OrderWhereInput =
    options.mode === 'trash'
      ? { deletedAt: { not: null } }
      : { deletedAt: null };

  const orders = await prisma.order.findMany({
    where,
    include: orderAdminInclude,
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((order) => ({
    id: order.id,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    userId: order.userId ?? null,
    promoCodeId: order.promoCodeId ?? null,
    promoCode: order.promoCode ? { code: order.promoCode.code } : null,
    shippingInfo: order.shippingInfo
      ? {
          fullName: order.shippingInfo.fullName,
          phoneMasked: maskPhone(order.shippingInfo.phone),
          phoneRaw: order.shippingInfo.phone,
          city: order.shippingInfo.city,
          addressShort: shortAddress(order.shippingInfo.address, order.shippingInfo.city),
          deliveryMethod: order.shippingInfo.deliveryMethod ?? null,
        }
      : null,
    deletedAt: order.deletedAt ? order.deletedAt.toISOString() : null,
  }));
}

/** Update order status. */
export async function updateOrderStatus(
  orderId: string,
  status: string
) {
  return prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
}

/** Update order with arbitrary data. */
export async function updateOrder(
  orderId: string,
  data: Prisma.OrderUpdateInput
) {
  return prisma.order.update({
    where: { id: orderId },
    data,
  });
}

export interface CreateOrderShippingParams {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  deliveryMethod?: string;
  cdekCityCode?: number;
  cdekPvzCode?: string;
  cdekTariffCode?: number;
  doorAddress?: {
    street?: string;
    house?: string;
    apartment?: string;
    entrance?: string;
    floor?: string;
    intercom?: string;
  };
}

/** Create order with items and shipping in a transaction. */
export async function createOrderWithItemsAndShipping(params: {
  total: number;
  promoCodeId: string | null;
  /** Сумма скидки по промокоду (для расчёта дохода партнёра от скидок). */
  promoDiscountAmount?: number | null;
  userId?: string | null;
  items: Array<{ productId: string; quantity: number; price: number }>;
  shipping: CreateOrderShippingParams;
}) {
  return prisma.$transaction(async (tx) => {
    const hasPromoCode = params.promoCodeId != null;
    const gifts = await calculateGiftsForOrder({
      items: params.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
        hasPromoPrice: false,
      })),
      hasPromoCode,
    });

    const created = await tx.order.create({
      data: {
        total: params.total,
        status: 'pending',
        promoCodeId: params.promoCodeId || undefined,
        promoDiscountAmount: params.promoDiscountAmount ?? undefined,
        userId: params.userId ?? undefined,
        items: {
          create: [
            ...params.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
              isGift: false,
              giftPromotionId: undefined,
            })),
            ...gifts.map((g) => ({
              productId: g.giftProductId,
              quantity: g.quantity,
              price: 0,
              isGift: true,
              giftPromotionId: g.giftPromotionId,
            })),
          ],
        },
      },
      include: { items: { include: { product: { select: { title: true } } } } },
    });

    const door = params.shipping.doorAddress;
    const addressForDb =
      door && (door.street ?? door.house ?? door.apartment)
        ? [door.street, door.house, door.apartment, door.entrance, door.floor, door.intercom]
            .filter(Boolean)
            .join(', ')
        : params.shipping.address.trim();

    await tx.shippingInfo.create({
      data: {
        orderId: created.id,
        fullName: params.shipping.fullName.trim(),
        phone: params.shipping.phone.trim(),
        email: params.shipping.email.trim(),
        address: addressForDb,
        city: params.shipping.city.trim(),
        zipCode: params.shipping.zipCode,
        country: params.shipping.country.trim(),
        deliveryMethod: params.shipping.deliveryMethod ?? undefined,
        cdekCityCode: params.shipping.cdekCityCode ?? undefined,
        cdekPvzCode: params.shipping.cdekPvzCode ?? undefined,
        cdekTariffCode: params.shipping.cdekTariffCode ?? undefined,
        street: door?.street?.trim(),
        house: door?.house?.trim(),
        apartment: door?.apartment?.trim(),
        entrance: door?.entrance?.trim(),
        floor: door?.floor?.trim(),
        intercom: door?.intercom?.trim(),
      },
    });

    if (params.promoCodeId) {
      await tx.promoCode.update({
        where: { id: params.promoCodeId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return created;
  });
}
