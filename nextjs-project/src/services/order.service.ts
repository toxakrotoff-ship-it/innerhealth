import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateGiftsForOrder } from '@/services/gift-promotion.service';
import { maskPhone, shortAddress } from '@/lib/pii-masking';
import type { BrandId } from '@/lib/brand/brand';
import { normalizeBrandId } from '@/lib/brand/brand';
import { isSprintPowerBrand } from '@/lib/brand/brand-scope';
import { resolveDbBrand } from '@/lib/brand/brand-db';
import {
  computePromoOrderTotals,
  type PromoOrderTotalsResult,
} from '@/lib/promo-order-totals';

export class OrderStockConflictError extends Error {
  readonly productTitle: string;

  constructor(productTitle: string) {
    super(`Недостаточно товара на складе: ${productTitle}`);
    this.name = 'OrderStockConflictError';
    this.productTitle = productTitle;
  }
}

const orderAdminInclude = {
  items: { include: { product: true } },
  promoCode: true,
  shippingInfo: true,
} as const;

interface ReservedOrderItem {
  productId: string;
  quantity: number;
  title: string;
  stock: number | null;
  isPreorderEnabled: boolean;
}

function aggregateReservedItems(
  items: ReadonlyArray<ReservedOrderItem>
): ReservedOrderItem[] {
  const aggregated = new Map<string, ReservedOrderItem>();

  for (const item of items) {
    const existing = aggregated.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }
    aggregated.set(item.productId, { ...item });
  }

  return Array.from(aggregated.values());
}

async function reserveStockForOrderItems(
  tx: Prisma.TransactionClient,
  items: ReadonlyArray<ReservedOrderItem>
) {
  for (const item of aggregateReservedItems(items)) {
    if (item.stock == null || item.isPreorderEnabled) continue;

    const updated = await tx.product.updateMany({
      where: {
        id: item.productId,
        quantity: { gte: item.quantity },
      },
      data: {
        quantity: { decrement: item.quantity },
      },
    });

    if (updated.count === 0) {
      throw new OrderStockConflictError(item.title);
    }
  }
}

async function restoreStockForOrderItems(
  tx: Prisma.TransactionClient,
  items: ReadonlyArray<ReservedOrderItem>
) {
  for (const item of aggregateReservedItems(items)) {
    if (item.stock == null || item.isPreorderEnabled) continue;

    await tx.product.update({
      where: { id: item.productId },
      data: {
        quantity: { increment: item.quantity },
      },
    });
  }
}

/** Get order by id (minimal, for webhook). */
export async function findOrderForWebhook(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, status: true, yookassaPaymentId: true, userId: true },
  });
}

/**
 * Бренд заказа для настроек уведомлений / ЮKassa / СДЭК (из `Order.brand`).
 */
export async function findOrderBrandIdForNotify(orderId: string): Promise<BrandId> {
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: { brand: true },
  });
  return normalizeBrandId(row?.brand) ?? 'inner';
}

/** Get order with shipping for CDEK flow. */
export async function findOrderWithShipping(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
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

/** Get order details for customer "paid" email and post-payment notifications. */
export async function findOrderForPaidEmail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      deliverySum: true,
      status: true,
      userId: true,
      promoCodeId: true,
      promoDiscountAmount: true,
      cdekTrackNumber: true,
      cdekOrderUuid: true,
      cdekOrderError: true,
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
      orderNumber: true,
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
  orderNumber: number | null;
  total: number;
  status: string;
  createdAt: string;
  userId: string | null;
  promoCodeId: string | null;
  promoCode: {
    code: string;
    discountType: string;
    discountValue: number;
  } | null;
  yookassaPaymentId: string | null;
  cdekOrderUuid: string | null;
  cdekTrackNumber: string | null;
  cdekOrderError: string | null;
  brand: BrandId;
  shippingInfo: {
    fullName: string;
    phoneMasked: string;
    phoneRaw: string;
    city: string;
    addressShort: string;
    deliveryMethod?: string | null;
  } | null;
  financials: PromoOrderTotalsResult;
}

function orderListBrandWhere(brandId?: BrandId | null): Prisma.OrderWhereInput {
  if (!brandId) return {};
  return { brand: isSprintPowerBrand(brandId) ? 'sprint-power' : 'inner' };
}

/** Get all orders for admin list with masked PII. */
export async function getOrdersForAdmin(brandId?: BrandId | null): Promise<AdminOrderDto[]> {
  const orders = await prisma.order.findMany({
    where: { deletedAt: null, ...orderListBrandWhere(brandId) },
    include: orderAdminInclude,
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((order) => mapOrderToAdminDto(order));
}

function mapOrderToAdminDto(
  order: Prisma.OrderGetPayload<{ include: typeof orderAdminInclude }>
): AdminOrderDto {
  const financials = computePromoOrderTotals({
    total: order.total,
    deliverySum: order.deliverySum,
    promoDiscountAmount: order.promoDiscountAmount,
    items: order.items.map((item) => ({
      quantity: item.quantity,
      price: item.price,
    })),
    promoCode: order.promoCode
      ? {
          discountType: order.promoCode.discountType,
          discountValue: order.promoCode.discountValue,
        }
      : null,
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber ?? null,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    userId: order.userId ?? null,
    promoCodeId: order.promoCodeId ?? null,
    promoCode: order.promoCode
      ? {
          code: order.promoCode.code,
          discountType: order.promoCode.discountType,
          discountValue: order.promoCode.discountValue,
        }
      : null,
    yookassaPaymentId: order.yookassaPaymentId ?? null,
    cdekOrderUuid: order.cdekOrderUuid ?? null,
    cdekTrackNumber: order.cdekTrackNumber ?? null,
    cdekOrderError: order.cdekOrderError ?? null,
    brand: normalizeBrandId(order.brand) ?? 'inner',
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
    financials,
  };
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

export interface CdekTrackPollCandidate extends CdekTrackSyncOrderCandidate {
  cdekTrackAdminEmailSentAt: Date | null;
  cdekTrackCustomerEmailSentAt: Date | null;
}

export type CdekTrackEmailChannel = 'admin' | 'customer';

/** Get orders for admin with optional trash filter. */
export async function getOrdersForAdminWithTrash(options: {
  mode: 'active' | 'trash';
  brandId?: BrandId | null;
}): Promise<AdminOrderWithDeletedDto[]> {
  const brandWhere = orderListBrandWhere(options.brandId);

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
    ...mapOrderToAdminDto(order),
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
  const orderBrand = normalizeBrandId(order.brand) ?? 'inner';
  if (isSprintPowerBrand(brandId) && orderBrand !== 'sprint-power') return null;
  if (!isSprintPowerBrand(brandId) && orderBrand === 'sprint-power') return null;

  return {
    ...mapOrderToAdminDto(order),
    yookassaPaymentId: order.yookassaPaymentId ?? null,
    cdekTrackNumber: order.cdekTrackNumber ?? null,
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
    brand: orderBrand,
  };
}

export interface PendingYookassaSyncOrderCandidate {
  id: string;
  status: string;
  createdAt: Date;
  yookassaPaymentId: string;
  yookassaCheckedAt: Date | null;
  brand: BrandId;
}

export async function getPendingOrdersWithYookassaPayment(options: {
  since: Date;
  take: number;
  brandId?: BrandId | null;
}): Promise<PendingYookassaSyncOrderCandidate[]> {
  const rows = await prisma.order.findMany({
    where: {
      deletedAt: null,
      status: 'pending',
      yookassaPaymentId: { not: null },
      createdAt: { gte: options.since },
      ...orderListBrandWhere(options.brandId),
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      yookassaPaymentId: true,
      yookassaCheckedAt: true,
      brand: true,
    } as Prisma.OrderSelect,
    orderBy: { createdAt: 'desc' },
    take: options.take,
  });

  return (rows as unknown as Array<{
    id: string;
    status: string;
    createdAt: Date;
    yookassaPaymentId: string | null;
    yookassaCheckedAt: Date | null;
    brand: string;
  }>)
    .filter((row) => typeof row.yookassaPaymentId === 'string' && row.yookassaPaymentId.length > 0)
    .map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      yookassaPaymentId: row.yookassaPaymentId as string,
      yookassaCheckedAt: row.yookassaCheckedAt ?? null,
      brand: normalizeBrandId(row.brand) ?? 'inner',
    }));
}

/** Зафиксировать факт фоновой проверки статуса в ЮKassa (для throttling-логики). */
export async function markYookassaChecked(
  orderId: string,
  checkedAt: Date = new Date()
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { yookassaCheckedAt: checkedAt } as Prisma.OrderUpdateInput,
  });
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

export async function findCdekTrackEmailState(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      cdekTrackAdminEmailSentAt: true,
      cdekTrackCustomerEmailSentAt: true,
    },
  });
}

/** Candidates are selected before throttling; oldest checks go first to avoid starvation. */
export async function getCdekTrackPollCandidates(options: {
  since: Date;
  take: number;
}): Promise<CdekTrackPollCandidate[]> {
  const orders = await prisma.order.findMany({
    where: {
      deletedAt: null,
      status: 'paid',
      createdAt: { gte: options.since },
      cdekOrderUuid: { not: null },
      shippingInfo: { deliveryMethod: { in: ['cdek_pvz', 'cdek_door'] } },
      OR: [
        { cdekTrackNumber: null },
        { cdekTrackAdminEmailSentAt: null },
        { cdekTrackCustomerEmailSentAt: null },
      ],
    },
    select: {
      id: true,
      createdAt: true,
      cdekOrderUuid: true,
      cdekTrackNumber: true,
      cdekTrackCheckedAt: true,
      cdekTrackAdminEmailSentAt: true,
      cdekTrackCustomerEmailSentAt: true,
      shippingInfo: { select: { deliveryMethod: true } },
    },
    orderBy: [
      { cdekTrackCheckedAt: { sort: 'asc', nulls: 'first' } },
      { createdAt: 'asc' },
    ],
    take: options.take,
  });
  return orders as CdekTrackPollCandidate[];
}

/**
 * Claims one email channel. A stale claim is recoverable after ten minutes, so a
 * killed worker cannot suppress notifications permanently.
 */
export async function claimCdekTrackEmailChannel(
  orderId: string,
  channel: CdekTrackEmailChannel,
  now = new Date()
): Promise<boolean> {
  const attemptedField = channel === 'admin'
    ? 'cdekTrackAdminEmailAttemptedAt'
    : 'cdekTrackCustomerEmailAttemptedAt';
  const sentField = channel === 'admin'
    ? 'cdekTrackAdminEmailSentAt'
    : 'cdekTrackCustomerEmailSentAt';
  const staleBefore = new Date(now.getTime() - 10 * 60 * 1000);
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      [sentField]: null,
      OR: [{ [attemptedField]: null }, { [attemptedField]: { lt: staleBefore } }],
    } as Prisma.OrderWhereInput,
    data: { [attemptedField]: now } as Prisma.OrderUpdateManyMutationInput,
  });
  return result.count === 1;
}

export async function finishCdekTrackEmailChannel(args: {
  orderId: string;
  channel: CdekTrackEmailChannel;
  ok: boolean;
  error?: string;
  now?: Date;
}): Promise<void> {
  const attemptedField = args.channel === 'admin'
    ? 'cdekTrackAdminEmailAttemptedAt'
    : 'cdekTrackCustomerEmailAttemptedAt';
  const sentField = args.channel === 'admin'
    ? 'cdekTrackAdminEmailSentAt'
    : 'cdekTrackCustomerEmailSentAt';
  const errorField = args.channel === 'admin'
    ? 'cdekTrackAdminEmailError'
    : 'cdekTrackCustomerEmailError';
  await prisma.order.update({
    where: { id: args.orderId },
    data: {
      [attemptedField]: args.ok ? (args.now ?? new Date()) : null,
      ...(args.ok ? { [sentField]: args.now ?? new Date() } : {}),
      [errorField]: args.ok ? null : (args.error ?? 'Неизвестная ошибка SMTP'),
    } as Prisma.OrderUpdateInput,
  });
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

export async function cancelPendingOrderAndRestoreStock(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        items: {
          select: {
            quantity: true,
            product: {
              select: {
                id: true,
                title: true,
                quantity: true,
                isPreorderEnabled: true,
              },
            },
          },
        },
      },
    });

    if (!order) return { found: false, changed: false, previousStatus: 'unknown', status: 'unknown' };
    if (order.status !== 'pending') {
      return {
        found: true,
        changed: false,
        previousStatus: order.status,
        status: order.status,
      };
    }

    await restoreStockForOrderItems(
      tx,
      order.items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        title: item.product.title,
        stock: item.product.quantity,
        isPreorderEnabled: item.product.isPreorderEnabled,
      }))
    );

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'canceled' },
    });

    return {
      found: true,
      changed: true,
      previousStatus: 'pending',
      status: 'canceled',
    };
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
  /** Стоимость доставки при оформлении (как в ЮKassa и корзине). */
  deliverySum?: number | null;
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

    const reservableProductIds = Array.from(
      new Set([
        ...params.items.map((item) => item.productId),
        ...gifts.map((gift) => gift.giftProductId),
      ])
    );

    const reservableProducts = await tx.product.findMany({
      where: { id: { in: reservableProductIds } },
      select: {
        id: true,
        title: true,
        quantity: true,
        isPreorderEnabled: true,
      },
    });
    const reservableProductMap = new Map(reservableProducts.map((product) => [product.id, product]));

    await reserveStockForOrderItems(tx, [
      ...params.items.map((item) => {
        const product = reservableProductMap.get(item.productId);
        if (!product) {
          throw new OrderStockConflictError(item.productId);
        }
        return {
          productId: item.productId,
          quantity: item.quantity,
          title: product.title,
          stock: product.quantity,
          isPreorderEnabled: product.isPreorderEnabled,
        };
      }),
      ...gifts.map((gift) => {
        const product = reservableProductMap.get(gift.giftProductId);
        if (!product) {
          throw new OrderStockConflictError(gift.giftProductId);
        }
        return {
          productId: gift.giftProductId,
          quantity: gift.quantity,
          title: product.title,
          stock: product.quantity,
          isPreorderEnabled: product.isPreorderEnabled,
        };
      }),
    ]);

    const created = await tx.order.create({
      data: {
        brand: resolveDbBrand(params.brandId),
        total: params.total,
        deliverySum:
          params.deliverySum != null && Number.isFinite(params.deliverySum) && params.deliverySum >= 0
            ? params.deliverySum
            : undefined,
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
