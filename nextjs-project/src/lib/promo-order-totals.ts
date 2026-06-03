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
  shipping: number | null;
  goodsAfterPromo: number | null;
  goodsBeforePromo: number | null;
  promoDiscount: number | null;
  nominalPromoLabel: string;
  effectivePercent: number | null;
  flags: {
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
  const missingPromoDiscount = input.promoDiscountAmount == null;
  const shippingEstimated = !hasPersistedDeliverySum(input.deliverySum);

  let shipping: number | null = null;
  if (!shippingEstimated) {
    shipping = input.deliverySum as number;
  } else {
    shipping = resolveShippingCostForOrderNotify({
      total: input.total,
      deliverySum: input.deliverySum,
      items: input.items,
    });
  }

  let promoDiscount: number | null = null;
  let goodsAfterPromo: number | null = null;
  let goodsBeforePromo: number | null = null;

  if (!missingPromoDiscount) {
    promoDiscount = input.promoDiscountAmount as number;
    if (!shippingEstimated && shipping != null) {
      goodsAfterPromo = input.total - shipping;
      goodsBeforePromo = goodsAfterPromo + promoDiscount;
    }
  } else if (!shippingEstimated && shipping != null) {
    goodsAfterPromo = input.total - shipping;
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
    shipping,
    goodsAfterPromo,
    goodsBeforePromo,
    promoDiscount,
    nominalPromoLabel: formatNominalPromoLabel(input.promoCode),
    effectivePercent,
    flags: {
      missingPromoDiscount,
      shippingEstimated,
      totalsReliable,
    },
  };
}
