import { describe, expect, it } from 'vitest'
import { resolveShippingCostForOrderNotify } from '@/lib/order-shipping-cost'

describe('resolveShippingCostForOrderNotify', () => {
  it('uses persisted deliverySum when set', () => {
    expect(
      resolveShippingCostForOrderNotify({
        total: 1300,
        deliverySum: 400,
        items: [{ quantity: 1, price: 1000 }],
      })
    ).toBe(400)
  })

  it('falls back to total minus line sum when deliverySum is null (legacy)', () => {
    expect(
      resolveShippingCostForOrderNotify({
        total: 1400,
        deliverySum: null,
        items: [{ quantity: 1, price: 1000 }],
      })
    ).toBe(400)
  })

  it('legacy fallback yields 0 when promo makes total less than nominal line total', () => {
    expect(
      resolveShippingCostForOrderNotify({
        total: 900,
        deliverySum: null,
        items: [{ quantity: 1, price: 1000 }],
      })
    ).toBe(0)
  })
})
