/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildCdekWidgetServicePath,
  readSenderCityCodeFromWidgetConfig,
  resolveCdekCityCodeByName,
  resolveWidgetGeoRegion,
  resolveWidgetOfficesBootstrap,
  resolveWidgetGeoRegionWithBudget,
  shouldExpandCountryOfficesAfterInit,
  WIDGET_GEO_API_TIMEOUT_MS,
  WIDGET_GEO_RESOLVE_BUDGET_MS,
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
    expect(WIDGET_GEO_RESOLVE_BUDGET_MS).toBe(2_000)
    expect(WIDGET_GEO_API_TIMEOUT_MS).toBe(5_000)
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
