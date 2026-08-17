import { describe, expect, it } from 'vitest'
import { normalizeCdekCity } from '@/lib/cdek'

describe('normalizeCdekCity', () => {
  it('uses the plain city field when present', () => {
    const result = normalizeCdekCity({ code: 44, city: 'Москва', region: 'Москва' })
    expect(result.city).toBe('Москва')
  })

  it('extracts city name from full_name when city is missing', () => {
    const result = normalizeCdekCity({
      code: 261,
      city_uuid: 'da2a871a-9a18-4ffc-9f4d-ae12bfde1a8d',
      full_name: 'Оренбург, городской округ Оренбург, Оренбургская область, Россия',
    })
    expect(result.city).toBe('Оренбург')
  })

  it('extracts distinct names for different settlements sharing a region', () => {
    const entries = [
      { code: 37996, full_name: 'Оренбургское, Бикинский район, Хабаровский край, Россия' },
      { code: 1905505, full_name: 'Лесничество, Оренбургский район, Оренбургская область, Россия' },
      { code: 54738, full_name: 'Бродецкое, Оренбургский район, Оренбургская область, Россия' },
    ]

    const names = entries.map((entry) => normalizeCdekCity(entry).city)
    expect(names).toEqual(['Оренбургское', 'Лесничество', 'Бродецкое'])
  })

  it('leaves city undefined when neither city nor full_name is present', () => {
    const result = normalizeCdekCity({ code: 1 })
    expect(result.city).toBeUndefined()
  })
})
