import type { CdekPvzOption } from '@/components/site/delivery-section'

/** Нормализация для поиска: регистр, ё→е, лишние пробелы и знаки. */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,;:()"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface CityQueryCandidate {
  city: string
  /** Остаток запроса — префикс улицы/адреса ПВЗ («Москва оре» → «оре») */
  rest: string
}

/**
 * Разбивает единую строку «город + начало улицы» на варианты (от самого длинного названия города к короткому).
 * «Санкт Петербург нев» → [«Санкт Петербург нев»/«», «Санкт Петербург»/«нев», «Санкт»/«Петербург нев»].
 * Первый вариант — вся строка как город.
 */
export function buildCityQueryCandidates(input: string): CityQueryCandidate[] {
  const words = input.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const result: CityQueryCandidate[] = []
  for (let n = words.length; n >= 1; n -= 1) {
    result.push({ city: words.slice(0, n).join(' '), rest: words.slice(n).join(' ') })
  }
  return result
}

/** Полный адрес ПВЗ для отображения. */
export function getPvzDisplayAddress(pvz: CdekPvzOption): string {
  return (pvz.full_address || pvz.address || pvz.name || pvz.code || '').trim()
}

/**
 * Фильтр ПВЗ по началу слов адреса/названия/кода: каждое слово запроса должно быть
 * началом какого-либо слова адреса. Точные префиксы улицы идут выше подстрочных совпадений.
 */
export function filterPvzByQuery(points: CdekPvzOption[], query: string): CdekPvzOption[] {
  const tokens = normalizeSearchText(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return points

  const scored: Array<{ pvz: CdekPvzOption; score: number }> = []
  for (const pvz of points) {
    const haystack = normalizeSearchText(
      [pvz.address, pvz.full_address, pvz.name, pvz.code].filter(Boolean).join(' ')
    )
    const words = haystack.split(' ')
    let score = 0
    let matchedAll = true
    for (const token of tokens) {
      const wordIndex = words.findIndex((w) => w.startsWith(token))
      if (wordIndex >= 0) {
        score += 100 - Math.min(wordIndex, 99)
      } else if (haystack.includes(token)) {
        score += 1
      } else {
        matchedAll = false
        break
      }
    }
    if (matchedAll) scored.push({ pvz, score })
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.pvz)
}
