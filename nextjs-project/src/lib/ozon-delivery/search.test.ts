import { describe, expect, it } from 'vitest'
import { ozonAddressSearchWords, ozonCityAddressPattern, ozonCitySearchName, ozonCitySuggestionPattern, ozonNonLocalityPattern } from './search'

// Both engines support this subset; PostgreSQL's whitespace class has a different spelling.
const pattern = (value: string) => new RegExp(value.replaceAll('[[:space:]]', '\\s').replaceAll('[[:space:]–—-]', '[\\s–—-]'), 'i')

describe('Ozon pickup search normalization', () => {
  it.each(['спб', 'СПб.', 'Питер', 'Санкт Петербург', 'г. Санкт-Петербург'])('recognizes %s', city => {
    expect(ozonCitySearchName(city)).toBe('Санкт-Петербург')
  })
  it('accepts separators and е/ё while keeping a whole locality boundary', () => {
    expect(pattern(ozonCityAddressPattern('Санкт Петербург')).test('Россия, г.Санкт-Петербург, ул. Мира, 1')).toBe(true)
    expect(pattern(ozonCityAddressPattern('Королев')).test('Россия, г. Королёв, ул. Мира, 1')).toBe(true)
    expect(pattern(ozonCityAddressPattern('Москва')).test('Россия, Москва, ул. Мира, 1')).toBe(true)
    expect(pattern(ozonCityAddressPattern('Москва')).test('Россия, Московский, ул. Москва, 1')).toBe(false)
    expect(pattern(ozonCityAddressPattern('Санкт')).test('Россия, Санкт-Петербург, ул. Мира, 1')).toBe(false)
    expect(pattern(ozonCityAddressPattern('А[Б]+')).test('Россия, АББ, улица')).toBe(false)
  })
  it('completes locality names instead of street names', () => {
    const complete = pattern(ozonCitySuggestionPattern('Санкт'))
    expect(complete.exec('Россия, 191167, г. Санкт-Петербург, ул. Мира, 1')?.[1]).toBe('Санкт-Петербург')
    expect(complete.exec('Россия, Москва, ул. Санкт-Петербургская, 1')).toBeNull()
    expect(pattern(ozonCitySuggestionPattern('Корол')).exec('Россия, г. Королёв, ул. Мира, 1')?.[1]).toBe('Королёв')
  })
  it('accepts punctuation, common address labels and е/ё', () => {
    expect(ozonAddressSearchWords('ул. Твёрская, д.10, корп. 2')).toEqual(['тверская', '10', '2'])
    expect(ozonAddressSearchWords('пр-т Мира,10')).toEqual(['мира', '10'])
    expect(ozonAddressSearchWords('Тверская 50%')).toEqual(['тверская', '50%'])
  })
  it('excludes countries, postcodes and regions from suggested locality names', () => {
    const excluded = pattern(ozonNonLocalityPattern)
    for (const name of ['Россия', '191167', 'Нижегородская область', 'Московская обл.']) expect(excluded.test(name)).toBe(true)
    expect(excluded.test('Нижний Новгород')).toBe(false)
    expect(excluded.test('Ростов-на-Дону')).toBe(false)
  })
})
