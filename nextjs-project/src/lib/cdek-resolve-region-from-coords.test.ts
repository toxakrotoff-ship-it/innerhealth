import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCdekRegionFromCoordinates } from '@/lib/cdek-resolve-region-from-coords'

vi.mock('@/lib/cdek-yandex-reverse-geocode', () => ({
  reverseGeocodeYandexCoordinates: vi.fn(),
}))

vi.mock('@/lib/cdek', () => ({
  getCdekSuggestCities: vi.fn(),
}))

const reverseGeocode = await import('@/lib/cdek-yandex-reverse-geocode')
const cdek = await import('@/lib/cdek')

const credentials = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  useTest: false,
}

describe('resolveCdekRegionFromCoordinates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps yandex locality to cdek region_code', async () => {
    vi.mocked(reverseGeocode.reverseGeocodeYandexCoordinates).mockResolvedValue({
      formattedAddress: 'Ярославль',
      locality: 'Ярославль',
      province: 'Ярославская область',
    })
    vi.mocked(cdek.getCdekSuggestCities).mockResolvedValue([
      {
        code: 170,
        city: 'Ярославль',
        region: 'Ярославская область',
        region_code: 39,
        country_code: 'RU',
      },
    ])

    const result = await resolveCdekRegionFromCoordinates({
      latitude: 57.6261,
      longitude: 39.8845,
      yandexApiKey: 'yandex-key',
      cdekCredentials: credentials,
    })

    expect(result).toEqual({
      regionCode: 39,
      cityCode: 170,
      city: 'Ярославль',
      region: 'Ярославская область',
      defaultLocation: 'Ярославль',
    })
  })

  it('prefers exact city name match over first suggest result', async () => {
    vi.mocked(reverseGeocode.reverseGeocodeYandexCoordinates).mockResolvedValue({
      formattedAddress: 'Вологда',
      locality: 'Вологда',
      province: 'Вологодская область',
    })
    vi.mocked(cdek.getCdekSuggestCities).mockResolvedValue([
      {
        code: 1,
        city: 'Другой город',
        region: 'Другой регион',
        region_code: 1,
        country_code: 'RU',
      },
      {
        code: 88,
        city: 'Вологда',
        region: 'Вологодская область',
        region_code: 66,
        country_code: 'RU',
      },
    ])

    const result = await resolveCdekRegionFromCoordinates({
      latitude: 59.22,
      longitude: 39.88,
      yandexApiKey: 'yandex-key',
      cdekCredentials: credentials,
    })

    expect(result?.regionCode).toBe(66)
    expect(result?.cityCode).toBe(88)
  })

  it('returns null when cdek city has no region_code', async () => {
    vi.mocked(reverseGeocode.reverseGeocodeYandexCoordinates).mockResolvedValue({
      formattedAddress: 'Город',
      locality: 'Город',
      province: null,
    })
    vi.mocked(cdek.getCdekSuggestCities).mockResolvedValue([
      {
        code: 10,
        city: 'Город',
        region: 'Регион',
        country_code: 'RU',
      },
    ])

    const result = await resolveCdekRegionFromCoordinates({
      latitude: 1,
      longitude: 2,
      yandexApiKey: 'yandex-key',
      cdekCredentials: credentials,
    })

    expect(result).toBeNull()
  })
})
