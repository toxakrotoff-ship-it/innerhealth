import { describe, expect, it } from 'vitest';
import { computePromoOrderTotals } from '@/lib/promo-order-totals';

const promoCode = { discountType: 'percentage', discountValue: 10 };

describe('computePromoOrderTotals', () => {
  it('computes full totals when deliverySum and promoDiscountAmount are present', () => {
    const result = computePromoOrderTotals({
      total: 1300,
      deliverySum: 300,
      promoDiscountAmount: 100,
      items: [{ quantity: 1, price: 1100 }],
      promoCode,
    });

    expect(result.shipping).toBe(300);
    expect(result.goodsAfterPromo).toBe(1000);
    expect(result.goodsBeforePromo).toBe(1100);
    expect(result.promoDiscount).toBe(100);
    expect(result.nominalPromoLabel).toBe('10%');
    expect(result.effectivePercent).toBeCloseTo(100 / 11, 5);
    expect(result.flags).toEqual({
      missingPromoDiscount: false,
      shippingEstimated: false,
      totalsReliable: true,
    });
  });

  it('marks missing promo discount and omits before/discount amounts', () => {
    const result = computePromoOrderTotals({
      total: 1300,
      deliverySum: 300,
      promoDiscountAmount: null,
      items: [{ quantity: 1, price: 1100 }],
      promoCode,
    });

    expect(result.promoDiscount).toBeNull();
    expect(result.goodsBeforePromo).toBeNull();
    expect(result.goodsAfterPromo).toBe(1000);
    expect(result.flags.missingPromoDiscount).toBe(true);
    expect(result.flags.totalsReliable).toBe(false);
  });

  it('uses legacy shipping estimate when deliverySum is absent', () => {
    const result = computePromoOrderTotals({
      total: 1400,
      deliverySum: null,
      promoDiscountAmount: 100,
      items: [{ quantity: 1, price: 1000 }],
      promoCode,
    });

    expect(result.shipping).toBe(400);
    expect(result.flags.shippingEstimated).toBe(true);
    expect(result.goodsAfterPromo).toBeNull();
    expect(result.goodsBeforePromo).toBeNull();
    expect(result.flags.totalsReliable).toBe(false);
  });

  it('is unreliable when both legacy flags apply', () => {
    const result = computePromoOrderTotals({
      total: 900,
      deliverySum: null,
      promoDiscountAmount: null,
      items: [{ quantity: 1, price: 1000 }],
      promoCode: { discountType: 'fixed', discountValue: 500 },
    });

    expect(result.nominalPromoLabel).toBe('500.00 ₽');
    expect(result.shipping).toBe(0);
    expect(result.goodsAfterPromo).toBeNull();
    expect(result.flags).toEqual({
      missingPromoDiscount: true,
      shippingEstimated: true,
      totalsReliable: false,
    });
  });
});
