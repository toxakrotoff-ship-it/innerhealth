import { describe, expect, it } from 'vitest'
import {
  buildCityQueryCandidates,
  filterPvzByQuery,
  normalizeSearchText,
} from './cdek-manual-search'

describe('normalizeSearchText', () => {
  it('приводит регистр и ё', () => {
    expect(normalizeSearchText('  Орёл,  ул. Ленина ')).toBe('орел ул ленина')
  })
})

describe('buildCityQueryCandidates', () => {
  it('«Москва оре» → сначала вся строка, затем город + остаток', () => {
    expect(buildCityQueryCandidates('Москва оре')).toEqual([
      { city: 'Москва оре', rest: '' },
      { city: 'Москва', rest: 'оре' },
    ])
  })
  it('пустая строка → пусто', () => {
    expect(buildCityQueryCandidates('  ')).toEqual([])
  })
})

describe('filterPvzByQuery', () => {
  const points = [
    { code: 'A', address: 'ул. Ореховый бульвар, 1' },
    { code: 'B', address: 'ул. Тверская, 5 (рядом с Ореховым)' },
    { code: 'C', address: 'ул. Ленина, 3' },
  ]
  it('пустой запрос возвращает всё', () => {
    expect(filterPvzByQuery(points, '')).toHaveLength(3)
  })
  it('префикс слова: «оре» находит Ореховый выше подстрочных совпадений', () => {
    const res = filterPvzByQuery(points, 'оре')
    expect(res.map((p) => p.code)).toEqual(['A', 'B'])
  })
  it('несколько слов должны совпасть все', () => {
    expect(filterPvzByQuery(points, 'ленина 3').map((p) => p.code)).toEqual(['C'])
    expect(filterPvzByQuery(points, 'ленина 99')).toEqual([])
  })
})
