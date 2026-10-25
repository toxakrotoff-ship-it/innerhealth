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

describe('createOrderBodySchema Ozon requirements', () => {
  const ozonShipping = {
    ...basePayload.shipping,
    deliveryMethod: 'ozon_pvz',
    ozonDeliveryPointId: 123,
    ozonQuoteToken: '123e4567-e89b-42d3-a456-426614174000',
  }

  it.each([
    { name: 'quote', ozonQuoteToken: undefined, ozonDeliveryPointId: 123 },
    { name: 'point', ozonQuoteToken: ozonShipping.ozonQuoteToken, ozonDeliveryPointId: undefined },
    { name: 'both references', ozonQuoteToken: undefined, ozonDeliveryPointId: undefined },
  ])('rejects Ozon delivery without $name', async ({ ozonQuoteToken, ozonDeliveryPointId }) => {
    const parsed = await createOrderBodySchema.safeParseAsync({
      ...basePayload,
      shipping: { ...ozonShipping, ozonQuoteToken, ozonDeliveryPointId },
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.map((issue) => issue.path.join('.'))).toContain('shipping.ozonQuoteToken')
  })

  it('rejects a quote token that is not a UUID', async () => {
    const parsed = await createOrderBodySchema.safeParseAsync({
      ...basePayload,
      shipping: { ...ozonShipping, ozonQuoteToken: 'unverified-quote' },
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.map((issue) => issue.path.join('.'))).toContain('shipping.ozonQuoteToken')
  })

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid Ozon point id %s', async (ozonDeliveryPointId) => {
    const parsed = await createOrderBodySchema.safeParseAsync({
      ...basePayload,
      shipping: { ...ozonShipping, ozonDeliveryPointId },
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.map((issue) => issue.path.join('.'))).toContain('shipping.ozonDeliveryPointId')
  })

  it('accepts Ozon delivery with its quote and point without any CDEK fields', async () => {
    const parsed = await createOrderBodySchema.safeParseAsync({ ...basePayload, shipping: ozonShipping })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.shipping.deliveryMethod).toBe('ozon_pvz')
    expect(parsed.data.shipping.ozonDeliveryPointId).toBe(123)
    expect(parsed.data.shipping.ozonQuoteToken).toBe(ozonShipping.ozonQuoteToken)
    expect(parsed.data.shipping).not.toHaveProperty('cdekCityCode')
    expect(parsed.data.shipping).not.toHaveProperty('cdekTariffCode')
    expect(parsed.data.shipping).not.toHaveProperty('cdekPvzCode')
  })
})
