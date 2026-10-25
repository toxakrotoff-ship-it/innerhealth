import { describe, expect, it } from 'vitest'
import { buildOzonParcel, ozonCartFingerprint, ozonMoneyToKopecks } from './parcel'

const line = { id: 'a', quantity: 2, price: 500, weight: 300, length: 100, width: 80, height: 40 }
describe('Ozon parcels', () => {
  it('counts every unit including gifts in conservative box dimensions', () => {
    expect(buildOzonParcel([line, { ...line, id: 'gift', quantity: 1, weight: 100 }])).toEqual({ weight_g: 700, length_mm: 100, width_mm: 80, height_mm: 120 })
  })
  it('refuses missing dimensions and oversize instead of inventing them', () => {
    expect(() => buildOzonParcel([{ ...line, weight: null }])).toThrow('вес или габариты')
    expect(() => buildOzonParcel([{ ...line, quantity: 99 }])).toThrow('габариты Ozon')
  })
  it('fingerprints cart contents, price, dimensions and promo independently of ordering', () => {
    const second = { ...line, id: 'b' }
    expect(ozonCartFingerprint([line, second])).toBe(ozonCartFingerprint([second, line]))
    for (const change of [{ price: 501 }, { quantity: 1 }, { height: 41 }]) expect(ozonCartFingerprint([{ ...line, ...change }])).not.toBe(ozonCartFingerprint([line]))
    expect(ozonCartFingerprint([line], 'promo')).not.toBe(ozonCartFingerprint([line]))
  })
  it('converts RUB decimals exactly and rejects malformed or unsafe amounts', () => {
    expect(ozonMoneyToKopecks({ amount: '123.45', currency_code: 'RUB' })).toBe(12345)
    expect(ozonMoneyToKopecks({ amount: '0.1', currency_code: 'RUB' })).toBe(10)
    for (const amount of ['-1', '1.234', 'NaN', '9007199254740992']) expect(() => ozonMoneyToKopecks({ amount, currency_code: 'RUB' })).toThrow()
    expect(() => ozonMoneyToKopecks({ amount: '10', currency_code: 'USD' })).toThrow()
  })
})
