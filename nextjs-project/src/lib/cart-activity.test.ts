import { describe, expect, it } from 'vitest'
import { cartActivityTimestamp, sanitizeCartActivityData } from '@/lib/cart-activity'

describe('cart activity privacy and timestamps', () => {
  it('keeps diagnostic codes while dropping contact data, addresses and free-form errors', () => {
    expect(sanitizeCartActivityData({
      deliveryMethod: 'cdek_pvz', pvzCode: 'MSK123', tariffCode: 136,
      phone: '+79990000000', email: 'buyer@example.com',
      address: 'Home address', city: 'Moscow', street: 'Main street',
      error: 'Customer phone +79990000000', stack: 'secret',
      reason: 'missing_pvz_or_tariff', status: 502,
    })).toEqual({
      deliveryMethod: 'cdek_pvz', pvzCode: 'MSK123', tariffCode: 136,
      reason: 'missing_pvz_or_tariff', status: 502,
    })
  })

  it('clamps untrusted client timestamps to the server clock', () => {
    const now = new Date('2026-09-30T10:00:00.000Z')
    expect(cartActivityTimestamp('2026-09-30T09:59:59.000Z', now).toISOString())
      .toBe('2026-09-30T09:59:59.000Z')
    expect(cartActivityTimestamp('2020-01-01T00:00:00.000Z', now)).toEqual(now)
  })
})
