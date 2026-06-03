import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { isSprintPowerBrand } from '@/lib/brand/brand-scope';
import { PAID_ORDER_STATUSES } from '@/lib/order-paid-statuses';
import {
  computePromoOrderTotals,
  type PromoOrderTotalsResult,
} from '@/lib/promo-order-totals';

export interface GetPromoOrdersReportParams {
  brandId?: BrandId | null;
  dateFrom: Date;
  dateTo: Date;
  promoCode?: string;
}

export interface PromoReportOrderItemRow {
  id: string;
  quantity: number;
  price: number;
  isGift: boolean;
  productTitle: string;
}

export interface PromoReportOrderRow {
  id: string;
  orderNumber: number;
  status: string;
  total: number;
  createdAt: Date;
  customerName: string | null;
  promoCode: string;
  promoDiscountType: string;
  promoDiscountValue: number;
  items: PromoReportOrderItemRow[];
  computed: PromoOrderTotalsResult;
}

export interface PromoOrdersReportSummary {
  ordersCount: number;
  reliableOrdersCount: number;
  incompleteOrdersCount: number;
  sumGoodsBeforePromo: number;
  sumPromoDiscount: number;
  sumGoodsAfterPromo: number;
}

export interface PromoOrdersReportResult {
  summary: PromoOrdersReportSummary;
  rows: PromoReportOrderRow[];
}

function orderListBrandWhere(brandId?: BrandId | null): Prisma.OrderWhereInput {
  return { brand: isSprintPowerBrand(brandId) ? 'sprint-power' : 'inner' };
}

/**
 * Paid orders with a promo code in the date range, with computed promo totals per row.
 */
export async function getPromoOrdersReport(
  params: GetPromoOrdersReportParams
): Promise<PromoOrdersReportResult> {
  const where: Prisma.OrderWhereInput = {
    deletedAt: null,
    promoCodeId: { not: null },
    status: { in: [...PAID_ORDER_STATUSES] },
    createdAt: {
      gte: params.dateFrom,
      lte: params.dateTo,
    },
    ...orderListBrandWhere(params.brandId),
    ...(params.promoCode
      ? { promoCode: { code: params.promoCode } }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      shippingInfo: { select: { fullName: true } },
      promoCode: {
        select: { code: true, discountType: true, discountValue: true },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          isGift: true,
          product: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows: PromoReportOrderRow[] = orders.map((order) => {
    const promo = order.promoCode!;
    const computed = computePromoOrderTotals({
      total: order.total,
      deliverySum: order.deliverySum,
      promoDiscountAmount: order.promoDiscountAmount,
      items: order.items.map((item) => ({
        quantity: item.quantity,
        price: item.price,
      })),
      promoCode: {
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      customerName: order.shippingInfo?.fullName ?? null,
      promoCode: promo.code,
      promoDiscountType: promo.discountType,
      promoDiscountValue: promo.discountValue,
      items: order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        isGift: item.isGift,
        productTitle: item.product.title,
      })),
      computed,
    };
  });

  let sumGoodsBeforePromo = 0;
  let sumPromoDiscount = 0;
  let sumGoodsAfterPromo = 0;
  let reliableOrdersCount = 0;

  for (const row of rows) {
    if (!row.computed.flags.totalsReliable) continue;
    reliableOrdersCount += 1;
    sumGoodsBeforePromo += row.computed.goodsBeforePromo ?? 0;
    sumPromoDiscount += row.computed.promoDiscount ?? 0;
    sumGoodsAfterPromo += row.computed.goodsAfterPromo ?? 0;
  }

  return {
    summary: {
      ordersCount: rows.length,
      reliableOrdersCount,
      incompleteOrdersCount: rows.length - reliableOrdersCount,
      sumGoodsBeforePromo,
      sumPromoDiscount,
      sumGoodsAfterPromo,
    },
    rows,
  };
}
