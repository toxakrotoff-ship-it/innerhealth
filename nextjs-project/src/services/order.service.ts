import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateGiftsForOrder } from '@/services/gift-promotion.service';
import { maskPhone, shortAddress } from '@/lib/pii-masking';
import type { BrandId } from '@/lib/brand/brand';
import { isSprintPowerBrand, SPRINT_POWER_PRODUCT_BRAND } from '@/lib/brand/brand-scope';

const orderAdminInclude = {
  items: { include: { product: true } },
  promoCode: true,
  shippingInfo: true,
} as const;

/** Get order by id (minimal, for webhook). */
export async function findOrderForWebhook(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, yookassaPaymentId: true, userId: true },
  });
}

/**
 * Бренд для настроек уведомлений / ЮKassa: по строкам заказа (товарный brand).
 * Заказы смешанного состава в API не допускаются; при отсутствии позиций — inner.
 */
export async function findOrderBrandIdForNotify(orderId: string): Promise<BrandId> {
  const rows = await prisma.orderItem.findMany({
    where: { orderId },
    select: { product: { select: { brand: true } } },
  });
  const hasSprintPower = rows.some(
    (row) => (row.product.brand ?? '').trim() === SPRINT_POWER_PRODUCT_BRAND
  );
  return hasSprintPower ? 'sprint-power' : 'inner';
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

/** Get order details for customer "paid" email. */
export async function findOrderForPaidEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      total: true,
      status: true,
      cdekTrackNumber: true,
      promoCode: { select: { code: true } },
      items: {
        select: {
          quantity: true,
          price: true,
          product: { select: { title: true } },
        },
      },
      shippingInfo: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          zipCode: true,
          country: true,
          deliveryMethod: true,
        },
      },
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
      cdekOrderError: true,
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
  cdekOrderUuid: string | null;
  cdekTrackNumber: string | null;
  cdekOrderError: string | null;
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
export async function getOrdersForAdmin(brandId?: BrandId | null): Promise<AdminOrderDto[]> {
  const brandWhere: Prisma.OrderWhereInput = isSprintPowerBrand(brandId)
    ? { items: { some: { product: { brand: SPRINT_POWER_PRODUCT_BRAND } } } }
    : {
        NOT: {
          items: { some: { product: { brand: SPRINT_POWER_PRODUCT_BRAND } } },
        },
      };
  const orders = await prisma.order.findMany({
    where: { deletedAt: null, ...brandWhere },
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
    cdekOrderUuid: order.cdekOrderUuid ?? null,
    cdekTrackNumber: order.cdekTrackNumber ?? null,
    cdekOrderError: order.cdekOrderError ?? null,
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

export interface AdminOrderDetailDto extends AdminOrderDto {
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      title: string;
      photo: string | null;
    };
  }>;
  cdekOrderUuid: string | null;
  cdekOrderError: string | null;
}

export interface CdekTrackSyncOrderCandidate {
  id: string;
  createdAt: Date;
  cdekOrderUuid: string | null;
  cdekTrackNumber: string | null;
  cdekTrackCheckedAt: Date | null;
  shippingInfo: {
    deliveryMethod: string | null;
  } | null;
}

/** Get orders for admin with optional trash filter. */
export async function getOrdersForAdminWithTrash(options: {
  mode: 'active' | 'trash';
  brandId?: BrandId | null;
}): Promise<AdminOrderWithDeletedDto[]> {
  const brandWhere: Prisma.OrderWhereInput = isSprintPowerBrand(options.brandId)
    ? { items: { some: { product: { brand: SPRINT_POWER_PRODUCT_BRAND } } } }
    : {
        NOT: {
          items: { some: { product: { brand: SPRINT_POWER_PRODUCT_BRAND } } },
        },
      };

  const where: Prisma.OrderWhereInput =
    options.mode === 'trash'
      ? { deletedAt: { not: null }, ...brandWhere }
      : { deletedAt: null, ...brandWhere };

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
    cdekOrderUuid: order.cdekOrderUuid ?? null,
    cdekTrackNumber: order.cdekTrackNumber ?? null,
    cdekOrderError: order.cdekOrderError ?? null,
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

/** Get single order details for admin popup. */
export async function getOrderDetailForAdmin(
  orderId: string,
  brandId?: BrandId | null
): Promise<AdminOrderDetailDto | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderAdminInclude,
  });

  if (!order) return null;
  const hasSprintPowerItem = order.items.some(
    (item) => item.product.brand === SPRINT_POWER_PRODUCT_BRAND
  );
  if (isSprintPowerBrand(brandId) && !hasSprintPowerItem) return null;
  if (!isSprintPowerBrand(brandId) && hasSprintPowerItem) return null;

  return {
    id: order.id,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    userId: order.userId ?? null,
    promoCodeId: order.promoCodeId ?? null,
    promoCode: order.promoCode ? { code: order.promoCode.code } : null,
    cdekTrackNumber: order.cdekTrackNumber ?? null,
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
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      product: {
        id: item.product.id,
        title: item.product.title,
        photo: item.product.photo,
      },
    })),
    cdekOrderUuid: order.cdekOrderUuid ?? null,
    cdekOrderError: order.cdekOrderError ?? null,
  };
}

export async function findOrderForCdekTrackSync(
  orderId: string
): Promise<CdekTrackSyncOrderCandidate | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      createdAt: true,
      cdekOrderUuid: true,
      cdekTrackNumber: true,
      cdekTrackCheckedAt: true,
      shippingInfo: {
        select: {
          deliveryMethod: true,
        },
      },
    } as Prisma.OrderSelect,
  });
  return order as CdekTrackSyncOrderCandidate | null;
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
  data: Prisma.OrderUpdateInput & {
    cdekTrackCheckedAt?: Date | null;
    cdekTrackNumber?: string | null;
    cdekOrderError?: string | null;
  }
) {
  return prisma.order.update({
    where: { id: orderId },
    data: data as Prisma.OrderUpdateInput,
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
  cdekCityUuid?: string;
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
  brandId?: BrandId | null;
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
      brandId: params.brandId ?? null,
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
        cdekCityUuid: params.shipping.cdekCityUuid?.trim() || undefined,
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
