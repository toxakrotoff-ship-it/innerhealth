import { describe, expect, it, vi } from 'vitest'
import { createOrderBodySchema } from './order'

vi.mock('@/lib/security/email-reality', () => ({
  validateEmailReality: vi.fn(async () => ({ valid: true })),
}))

const basePayload = {
  items: [{ productId: 'p1', quantity: 1, price: 1000 }],
  total: 1000,
  shipping: {
    fullName: 'Тест',
    phone: '+7 (999) 999-99-99',
    email: 'test@example.com',
    address: 'Россия, Москва, улица Симоновский Вал, 2',
    city: 'Москва',
    zipCode: '',
    country: 'Россия',
  },
}

describe('createOrderBodySchema CDEK requirements', () => {
  it('requires city code, tariff and pvz code for cdek_pvz', async () => {
    const parsed = await createOrderBodySchema.safeParseAsync({
      ...basePayload,
      shipping: {
        ...basePayload.shipping,
        deliveryMethod: 'cdek_pvz',
      },
    })

    expect(parsed.success).toBe(false)
    if (parsed.success) return
    const issues = parsed.error.issues.map((issue) => issue.path.join('.'))
    expect(issues).toContain('shipping.cdekCityCode')
    expect(issues).toContain('shipping.cdekTariffCode')
    expect(issues).toContain('shipping.cdekPvzCode')
  })

  it('requires structured door address for cdek_door', async () => {
    const parsed = await createOrderBodySchema.safeParseAsync({
      ...basePayload,
      shipping: {
        ...basePayload.shipping,
        deliveryMethod: 'cdek_door',
        cdekCityCode: 44,
        cdekTariffCode: 137,
      },
    })

    expect(parsed.success).toBe(false)
    if (parsed.success) return
    const issues = parsed.error.issues.map((issue) => issue.path.join('.'))
    expect(issues).toContain('shipping.doorAddress.street')
    expect(issues).toContain('shipping.doorAddress.house')
  })

  it('accepts a complete cdek_door payload', async () => {
    const parsed = await createOrderBodySchema.safeParseAsync({
      ...basePayload,
      shipping: {
        ...basePayload.shipping,
        deliveryMethod: 'cdek_door',
        cdekCityCode: 44,
        cdekTariffCode: 137,
        doorAddress: {
          street: 'улица Симоновский Вал',
          house: '2',
          apartment: '42',
        },
      },
    })

    expect(parsed.success).toBe(true)
  })
})
