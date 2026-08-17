/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildCdekWidgetServicePath,
  extractCityFromSenderAddress,
  guessCityFromFormattedAddress,
  isCdekWidgetMobileClient,
  isCdekWidgetMobileViewport,
  isCdekWidgetNarrowLayout,
  readSenderCityCodeFromWidgetConfig,
  readWidgetSenderCityFromConfig,
  resolveCdekCityCodeByName,
  resolveWidgetDefaultLocation,
  resolveWidgetGeoRegion,
  resolveWidgetOfficesBootstrap,
  resolveWidgetGeoRegionWithBudget,
  shouldExpandCountryOfficesAfterInit,
  WIDGET_GEO_API_TIMEOUT_MS,
  WIDGET_GEO_RESOLVE_BUDGET_MS,
  WIDGET_GEO_TOTAL_BUDGET_MS,
} from '@/lib/cdek-widget-geo-region'

describe('cdek-widget-geo-region', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('builds service path with region bootstrap params', () => {
    expect(
      buildCdekWidgetServicePath({
        brandId: 'inner',
        regionCode: 39,
      })
    ).toBe('/api/cdek-widget/service?brand=inner&widget_offices_scope=region&region_code=39')
  })

  it('builds service path with sender city fallback when geo is unavailable', () => {
    expect(
      buildCdekWidgetServicePath({
        brandId: 'inner',
        fallbackCityCode: 137,
      })
    ).toBe('/api/cdek-widget/service?brand=inner&city_code=137')
  })

  it('reads sender city code from widget config', () => {
    expect(readSenderCityCodeFromWidgetConfig({ code: 137, country_code: 'RU' })).toBe(137)
    expect(readSenderCityCodeFromWidgetConfig({ code: '44' })).toBe(44)
    expect(readSenderCityCodeFromWidgetConfig(null)).toBeNull()
  })

  it('schedules background country expand only for region or sender-city bootstrap', () => {
    expect(shouldExpandCountryOfficesAfterInit({ regionCode: 39 })).toBe(true)
    expect(shouldExpandCountryOfficesAfterInit({ fallbackCityCode: 137 })).toBe(true)
    expect(shouldExpandCountryOfficesAfterInit({})).toBe(false)
  })

  it('expands background country offices on mobile after geo_region bootstrap too', () => {
    // The widget's own city search only re-centers the map (it re-geocodes the typed
    // text) — it never re-scopes which offices are loaded, so skipping the country-wide
    // background expansion on mobile left mobile users unable to see any pickup points
    // after searching for a city outside their own bootstrapped region.
    expect(isCdekWidgetNarrowLayout(390)).toBe(true)
    expect(isCdekWidgetNarrowLayout(555)).toBe(false)
    expect(isCdekWidgetMobileViewport(390)).toBe(true)

    const matchMedia = (query: string) => ({
      matches:
        query.includes('767px') ||
        (query.includes('932px') && query.includes('max-width')),
    })

    expect(isCdekWidgetMobileClient({ matchMedia })).toBe(true)
    expect(
      isCdekWidgetMobileClient({
        containerWidth: 844,
        matchMedia: (query) => ({
          matches:
            query === '(hover: none) and (pointer: coarse)' ||
            query === '(max-width: 932px)',
        }),
      })
    ).toBe(true)

    expect(
      shouldExpandCountryOfficesAfterInit({
        regionCode: 82,
        bootstrapSource: 'geo_region',
        isMobileClient: true,
      })
    ).toBe(true)

    expect(
      shouldExpandCountryOfficesAfterInit({
        regionCode: 82,
        bootstrapSource: 'geo_region',
        isMobileClient: false,
      })
    ).toBe(true)

    expect(
      shouldExpandCountryOfficesAfterInit({
        fallbackCityCode: 44,
        bootstrapSource: 'sender_city',
        isMobileClient: true,
      })
    ).toBe(true)
  })

  it('expands country offices when bootstrap fully fails (server silently falls back to a default city)', () => {
    expect(
      shouldExpandCountryOfficesAfterInit({
        regionCode: null,
        fallbackCityCode: null,
        bootstrapSource: 'country',
        isMobileClient: false,
      })
    ).toBe(true)

    expect(
      shouldExpandCountryOfficesAfterInit({
        regionCode: null,
        fallbackCityCode: null,
        bootstrapSource: 'country',
        isMobileClient: true,
      })
    ).toBe(true)
  })

  it('extracts city name from sender address', () => {
    expect(extractCityFromSenderAddress('Санкт-Петербург, склад')).toBe('Санкт-Петербург')
    expect(extractCityFromSenderAddress('  ')).toBeNull()
  })

  it('guesses city from a Yandex-formatted door address', () => {
    expect(guessCityFromFormattedAddress('Россия, Московская область, Химки, Молодёжная улица, 2')).toBe(
      'Химки'
    )
    expect(guessCityFromFormattedAddress('Россия, Республика Татарстан, Казань, улица Баумана, 1')).toBe(
      'Казань'
    )
    expect(guessCityFromFormattedAddress('Россия, Москва, Тверская улица, 7')).toBe('Москва')
    expect(guessCityFromFormattedAddress(null)).toBeNull()
    expect(guessCityFromFormattedAddress('  ')).toBeNull()
    // No locality-like segment before the street part — nothing reliable to guess.
    expect(guessCityFromFormattedAddress('Россия, Краснодарский край, улица Мира, 10')).toBeNull()
  })

  it('returns null when geolocation never resolves within budget', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: () => undefined,
      },
    })

    const result = await resolveWidgetGeoRegionWithBudget({
      brandId: 'inner',
      geolocationBudgetMs: 20,
    })

    expect(result).toBeNull()
    expect(WIDGET_GEO_TOTAL_BUDGET_MS).toBe(12_000)
    expect(WIDGET_GEO_RESOLVE_BUDGET_MS).toBe(10_000)
    expect(WIDGET_GEO_API_TIMEOUT_MS).toBe(8_000)
  })

  it('resolves region when geolocation is fast even if geo API is slow', async () => {
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve(
              new Response(
                JSON.stringify({
                  region: {
                    regionCode: 39,
                    cityCode: 170,
                    city: 'Ярославль',
                    region: 'Ярославская область',
                    defaultLocation: 'Ярославль',
                  },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              )
            )
          }, 50)
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await resolveWidgetGeoRegion({
      brandId: 'inner',
      coords: {
        latitude: 57.6261,
        longitude: 39.8845,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      geoApiTimeoutMs: 1_000,
    })

    expect(result?.regionCode).toBe(39)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to saved city code when geolocation is denied', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error: PositionErrorCallback
        ) => {
          error({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'denied',
          } as GeolocationPositionError)
        },
      },
    })

    const result = await resolveWidgetOfficesBootstrap({
      brandId: 'inner',
      bootstrapCityCode: 170,
      defaultLocation: 'Ярославль',
      senderCityCode: 44,
    })

    expect(result.bootstrap).toEqual({
      regionCode: null,
      fallbackCityCode: 170,
      bootstrapSource: 'saved_city',
      geoDenied: true,
    })
  })

  it('falls back to city name lookup when geo is unavailable', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error: PositionErrorCallback
        ) => {
          error({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'denied',
          } as GeolocationPositionError)
        },
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ code: 88, city: 'Вологда' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    const result = await resolveWidgetOfficesBootstrap({
      brandId: 'inner',
      defaultLocation: 'Вологда',
      senderCityCode: 44,
    })

    expect(result.bootstrap.bootstrapSource).toBe('location_name')
    expect(result.bootstrap.fallbackCityCode).toBe(88)
    expect(result.bootstrap.geoDenied).toBe(true)
  })

  it('reads sender city name from widget config', () => {
    expect(
      readWidgetSenderCityFromConfig({ code: 44, city: 'Москва', country_code: 'RU' })
    ).toBe('Москва')
    expect(
      readWidgetSenderCityFromConfig({ code: 44, address: 'Санкт-Петербург, Невский пр., 1' })
    ).toBe('Санкт-Петербург')
    expect(readWidgetSenderCityFromConfig({ code: 44 })).toBeNull()
  })

  it('resolves default location without hardcoded Moscow fallback', () => {
    expect(
      resolveWidgetDefaultLocation({
        geoRegion: {
          regionCode: 82,
          cityCode: 137,
          city: 'Санкт-Петербург',
          region: 'Ленинградская область',
          defaultLocation: 'Санкт-Петербург, Россия',
        },
      })
    ).toBe('Санкт-Петербург, Россия')

    expect(
      resolveWidgetDefaultLocation({
        configFrom: { code: 44, city: 'Москва', country_code: 'RU' },
      })
    ).toBe('Москва')

    expect(resolveWidgetDefaultLocation({})).toBe('Россия')
  })

  it('resolves city code by name from cdek cities api', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([{ code: 170, city: 'Ярославль' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    await expect(resolveCdekCityCodeByName({ brandId: 'inner', cityName: 'Ярославль' })).resolves.toBe(
      170
    )
  })
})
