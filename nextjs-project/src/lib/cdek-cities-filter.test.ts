import { describe, expect, it } from 'vitest'
import {
  CDEK_CIS_COUNTRY_CODES,
  CDEK_RUSSIA_COUNTRY_CODE,
  filterCdekCitiesToCis,
  isCdekCisCountryCode,
  type CdekCity,
} from '@/lib/cdek'

describe('filterCdekCitiesToCis', () => {
  it('keeps cities from CIS countries', () => {
    const cities: CdekCity[] = [
      { code: 44, city: 'Москва', country_code: CDEK_RUSSIA_COUNTRY_CODE },
      { code: 100, city: 'Минск', country_code: 'BY' },
      { code: 200, city: 'Алматы', country_code: 'KZ' },
    ]

    expect(filterCdekCitiesToCis(cities)).toHaveLength(3)
  })

  it('drops cities outside CIS', () => {
    const cities: CdekCity[] = [
      { code: 44, city: 'Москва', country_code: CDEK_RUSSIA_COUNTRY_CODE },
      { code: 1, city: 'Cairo', country_code: 'EG' },
      { code: 2, city: 'Warsaw', country_code: 'PL' },
    ]

    const filtered = filterCdekCitiesToCis(cities)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.city).toBe('Москва')
  })

  it('recognizes all configured CIS country codes', () => {
    for (const code of CDEK_CIS_COUNTRY_CODES) {
      expect(isCdekCisCountryCode(code)).toBe(true)
    }
    expect(isCdekCisCountryCode('DE')).toBe(false)
  })
})
