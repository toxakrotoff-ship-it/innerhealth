import { describe, expect, it } from 'vitest'
import { buildCdekDoorAddress, buildCdekPvzAddress, extractCdekPvzCodeFromAddress } from './cdek'

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

  it('drops checkout comments from fallback addresses', () => {
    expect(
      buildCdekDoorAddress({
        address: 'Россия, Москва, улица Симоновский Вал, 2\nКомментарий: позвонить за час',
      })
    ).toBe('Россия, Москва, улица Симоновский Вал, 2')
  })

  it('rejects too generic fallback addresses', () => {
    expect(buildCdekDoorAddress({ address: 'Россия, Москва' })).toBeNull()
  })
})

describe('buildCdekPvzAddress', () => {
  it('strips the PVZ prefix and returns a detailed pickup address', () => {
    expect(
      buildCdekPvzAddress('СДЭК ПВЗ KRA16: ш. Егорьевское, 4, стр. 1')
    ).toBe('ш. Егорьевское, 4, стр. 1')
  })

  it('extracts the exact PVZ address when city and district are stored before the PVZ marker', () => {
    expect(
      buildCdekPvzAddress('Люберцы, г/о Люберцы, СДЭК ПВЗ KRA16: ш. Егорьевское, 4')
    ).toBe('ш. Егорьевское, 4')
  })

  it('drops checkout comments from PVZ addresses', () => {
    expect(
      buildCdekPvzAddress(
        'Люберцы, г/о Люберцы, СДЭК ПВЗ KRA16: ш. Егорьевское, 4\nКомментарий: после 18:00'
      )
    ).toBe('ш. Егорьевское, 4')
  })

  it('falls back to the original address when there is no PVZ marker', () => {
    expect(buildCdekPvzAddress('Люберцы, ш. Егорьевское, 4')).toBe('Люберцы, ш. Егорьевское, 4')
  })

  it('returns null for empty values', () => {
    expect(buildCdekPvzAddress('   ')).toBeNull()
  })
})
