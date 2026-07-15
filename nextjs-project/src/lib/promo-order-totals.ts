import { resolveShippingCostForOrderNotify } from '@/lib/order-shipping-cost';

export interface PromoOrderTotalsInput {
  total: number;
  deliverySum: number | null;
  promoDiscountAmount: number | null;
  items: Array<{ quantity: number; price: number }>;
  promoCode: {
    discountType: string;
    discountValue: number;
  } | null;
}

export interface PromoOrderTotalsResult {
  total: number;
  delivery: number | null;
  shipping: number | null;
  goodsAfterPromo: number | null;
  goodsBeforePromo: number | null;
  promoDiscount: number | null;
  nominalPromoLabel: string;
  effectivePercent: number | null;
  flags: {
    hasPromoCode: boolean;
    missingPromoDiscount: boolean;
    shippingEstimated: boolean;
    totalsReliable: boolean;
  };
}

function formatNominalPromoLabel(
  promoCode: PromoOrderTotalsInput['promoCode']
): string {
  if (!promoCode) return '—';
  if (promoCode.discountType === 'percentage') {
    return `${promoCode.discountValue}%`;
  }
  return `${promoCode.discountValue.toFixed(2)} ₽`;
}

function hasPersistedDeliverySum(deliverySum: number | null): boolean {
  return deliverySum != null && Number.isFinite(deliverySum) && deliverySum >= 0;
}

/**
 * Derives promo report line amounts and legacy-data flags for a paid order with a promo code.
 */
export function computePromoOrderTotals(input: PromoOrderTotalsInput): PromoOrderTotalsResult {
  const hasPromoCode = input.promoCode != null;
  const missingPromoDiscount = hasPromoCode && input.promoDiscountAmount == null;
  const shippingEstimated = !hasPersistedDeliverySum(input.deliverySum);

  let delivery: number | null = null;
  if (!shippingEstimated) {
    delivery = input.deliverySum as number;
  } else {
    delivery = resolveShippingCostForOrderNotify({
      total: input.total,
      deliverySum: input.deliverySum,
      items: input.items,
    });
  }

  let promoDiscount: number | null = null;
  let goodsAfterPromo: number | null = null;
  let goodsBeforePromo: number | null = null;

  if (!hasPromoCode) {
    promoDiscount = 0;
    if (!shippingEstimated && delivery != null) {
      goodsAfterPromo = input.total - delivery;
      goodsBeforePromo = goodsAfterPromo;
    }
  } else if (!missingPromoDiscount) {
    promoDiscount = input.promoDiscountAmount as number;
    if (!shippingEstimated && delivery != null) {
      goodsAfterPromo = input.total - delivery;
      goodsBeforePromo = goodsAfterPromo + promoDiscount;
    }
  } else if (!shippingEstimated && delivery != null) {
    goodsAfterPromo = input.total - delivery;
  }

  const effectivePercent =
    goodsBeforePromo != null &&
    goodsBeforePromo > 0 &&
    promoDiscount != null &&
    promoDiscount > 0
      ? (promoDiscount / goodsBeforePromo) * 100
      : null;

  const totalsReliable = !missingPromoDiscount && !shippingEstimated;

  return {
    total: input.total,
    delivery,
    shipping: delivery,
    goodsAfterPromo,
    goodsBeforePromo,
    promoDiscount,
    nominalPromoLabel: formatNominalPromoLabel(input.promoCode),
    effectivePercent,
    flags: {
      hasPromoCode,
      missingPromoDiscount,
      shippingEstimated,
      totalsReliable,
    },
  };
}
