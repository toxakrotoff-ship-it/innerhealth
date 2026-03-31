import { describe, expect, it } from 'vitest'
import { buildCdekDoorAddress, extractCdekPvzCodeFromAddress } from './cdek'

describe('extractCdekPvzCodeFromAddress', () => {
  it('extracts PVZ code from formatted address', () => {
    expect(extractCdekPvzCodeFromAddress('СДЭК ПВЗ ARK1: пос. Архангельское, 17В')).toBe('ARK1')
    expect(
      extractCdekPvzCodeFromAddress(
        'Архангельское, городской округ Красногорск, СДЭК ПВЗ ark1: пос. Архангельское, 17В'
      )
    ).toBe('ARK1')
  })

  it('returns null when address does not contain a PVZ marker', () => {
    expect(extractCdekPvzCodeFromAddress('Россия, Москва')).toBeNull()
  })
})

describe('buildCdekDoorAddress', () => {
  it('prefers structured door address fields', () => {
    expect(
      buildCdekDoorAddress({
        address: 'Россия, Москва, улица Симоновский Вал, 2',
        street: 'улица Симоновский Вал',
        house: '2',
        apartment: '42',
        entrance: '2',
        floor: '1',
        intercom: '123',
      })
    ).toBe('улица Симоновский Вал, 2, 42, 2, 1, 123')
  })

  it('falls back to full address when it is detailed enough', () => {
    expect(
      buildCdekDoorAddress({
        address: 'Россия, Москва, улица Симоновский Вал, 2',
      })
    ).toBe('Россия, Москва, улица Симоновский Вал, 2')
  })

  it('rejects too generic fallback addresses', () => {
    expect(buildCdekDoorAddress({ address: 'Россия, Москва' })).toBeNull()
  })
})
