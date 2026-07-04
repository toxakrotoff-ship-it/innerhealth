import type { BrandId } from '@/lib/brand/brand'

export interface WidgetGeoRegion {
  regionCode: number
  cityCode: number | null
  city: string | null
  region: string | null
  defaultLocation: string
}

export type GeolocationFailureReason = 'denied' | 'unavailable' | 'timeout' | null

export type WidgetOfficesBootstrapSource =
  | 'geo_region'
  | 'saved_city'
  | 'location_name'
  | 'sender_city'
  | 'country'

export interface WidgetOfficesBootstrap {
  regionCode: number | null
  fallbackCityCode: number | null
  bootstrapSource: WidgetOfficesBootstrapSource
  geoDenied: boolean
}

export const WIDGET_GEO_RESOLVE_BUDGET_MS = 2_000
export const WIDGET_GEO_API_TIMEOUT_MS = 5_000

export interface GeolocationReadResult {
  coords: GeolocationCoordinates | null
  failureReason: GeolocationFailureReason
}

export async function readBrowserGeolocation(
  timeoutMs: number = WIDGET_GEO_RESOLVE_BUDGET_MS
): Promise<GeolocationCoordinates | null> {
  const result = await readBrowserGeolocationDetailed(timeoutMs)
  return result.coords
}

export async function readBrowserGeolocationDetailed(
  timeoutMs: number = WIDGET_GEO_RESOLVE_BUDGET_MS
): Promise<GeolocationReadResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { coords: null, failureReason: 'unavailable' }
  }

  return new Promise((resolve) => {
    let settled = false

    const finish = (coords: GeolocationCoordinates | null, failureReason: GeolocationFailureReason) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ coords, failureReason })
    }

    const timer = setTimeout(() => finish(null, 'timeout'), timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) => finish(position.coords, null),
      (error) => {
        const failureReason: GeolocationFailureReason =
          error.code === error.PERMISSION_DENIED
            ? 'denied'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'unavailable'
              : 'timeout'
        finish(null, failureReason)
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300_000,
        timeout: timeoutMs,
      }
    )
  })
}

export async function resolveCdekCityCodeByName(params: {
  brandId?: BrandId
  cityName: string
}): Promise<number | null> {
  const query = params.cityName.trim()
  if (!query) return null

  const brandQuery = params.brandId ? `&brand=${encodeURIComponent(params.brandId)}` : ''
  const response = await fetch(`/api/cdek/cities?q=${encodeURIComponent(query)}&size=1${brandQuery}`, {
    cache: 'no-store',
  })
  if (!response.ok) return null

  const cities = (await response.json()) as Array<{ code?: number }>
  const code = cities[0]?.code
  return typeof code === 'number' && Number.isFinite(code) && code > 0 ? Math.trunc(code) : null
}

export async function resolveWidgetGeoRegion(params: {
  brandId?: BrandId
  geolocationTimeoutMs?: number
  geoApiTimeoutMs?: number
  coords?: GeolocationCoordinates | null
}): Promise<WidgetGeoRegion | null> {
  const coords =
    params.coords !== undefined
      ? params.coords
      : await readBrowserGeolocation(params.geolocationTimeoutMs)
  if (!coords) return null

  const brandQuery = params.brandId ? `?brand=${encodeURIComponent(params.brandId)}` : ''
  const geoApiTimeoutMs = params.geoApiTimeoutMs ?? WIDGET_GEO_API_TIMEOUT_MS
  const abortController = new AbortController()
  const apiTimeoutId = setTimeout(() => abortController.abort(), geoApiTimeoutMs)

  try {
    const response = await fetch(`/api/cdek-widget/geo-region${brandQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      cache: 'no-store',
      signal: abortController.signal,
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      region?: WidgetGeoRegion | null
    }

    const region = payload.region
    if (!region || !Number.isFinite(region.regionCode) || region.regionCode <= 0) {
      return null
    }

    return region
  } catch {
    return null
  } finally {
    clearTimeout(apiTimeoutId)
  }
}

export async function resolveWidgetGeoRegionWithBudget(params: {
  brandId?: BrandId
  geolocationBudgetMs?: number
  geoApiTimeoutMs?: number
}): Promise<WidgetGeoRegion | null> {
  const geolocationBudgetMs = params.geolocationBudgetMs ?? WIDGET_GEO_RESOLVE_BUDGET_MS
  const geolocation = await readBrowserGeolocationDetailed(geolocationBudgetMs)
  if (!geolocation.coords) return null

  return resolveWidgetGeoRegion({
    brandId: params.brandId,
    coords: geolocation.coords,
    geoApiTimeoutMs: params.geoApiTimeoutMs ?? WIDGET_GEO_API_TIMEOUT_MS,
  })
}

export async function resolveWidgetGeoRegionWithBudgetDetailed(params: {
  brandId?: BrandId
  geolocationBudgetMs?: number
  geoApiTimeoutMs?: number
}): Promise<{ geoRegion: WidgetGeoRegion | null; geoDenied: boolean }> {
  const geolocationBudgetMs = params.geolocationBudgetMs ?? WIDGET_GEO_RESOLVE_BUDGET_MS
  const geolocation = await readBrowserGeolocationDetailed(geolocationBudgetMs)
  if (!geolocation.coords) {
    return {
      geoRegion: null,
      geoDenied: geolocation.failureReason === 'denied',
    }
  }

  const geoRegion = await resolveWidgetGeoRegion({
    brandId: params.brandId,
    coords: geolocation.coords,
    geoApiTimeoutMs: params.geoApiTimeoutMs ?? WIDGET_GEO_API_TIMEOUT_MS,
  })

  return { geoRegion, geoDenied: false }
}

export function readSenderCityCodeFromWidgetConfig(from: unknown): number | null {
  if (!from || typeof from !== 'object') return null
  const code = (from as { code?: unknown }).code
  if (typeof code === 'number' && Number.isFinite(code) && code > 0) return Math.trunc(code)
  if (typeof code === 'string' && code.trim().length > 0) {
    const parsed = Number.parseInt(code.trim(), 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

export async function resolveWidgetOfficesBootstrap(params: {
  brandId?: BrandId
  bootstrapCityCode?: number | null
  defaultLocation?: string | null
  senderCityCode?: number | null
}): Promise<{
  geoRegion: WidgetGeoRegion | null
  bootstrap: WidgetOfficesBootstrap
}> {
  const { geoRegion, geoDenied } = await resolveWidgetGeoRegionWithBudgetDetailed({
    brandId: params.brandId,
  })

  if (geoRegion?.regionCode) {
    return {
      geoRegion,
      bootstrap: {
        regionCode: geoRegion.regionCode,
        fallbackCityCode: null,
        bootstrapSource: 'geo_region',
        geoDenied: false,
      },
    }
  }

  const savedCityCode =
    params.bootstrapCityCode != null &&
    Number.isFinite(params.bootstrapCityCode) &&
    params.bootstrapCityCode > 0
      ? Math.trunc(params.bootstrapCityCode)
      : null
  if (savedCityCode != null) {
    return {
      geoRegion: null,
      bootstrap: {
        regionCode: null,
        fallbackCityCode: savedCityCode,
        bootstrapSource: 'saved_city',
        geoDenied,
      },
    }
  }

  const locationName = params.defaultLocation?.trim()
  if (locationName) {
    const cityCodeFromName = await resolveCdekCityCodeByName({
      brandId: params.brandId,
      cityName: locationName,
    })
    if (cityCodeFromName != null) {
      return {
        geoRegion: null,
        bootstrap: {
          regionCode: null,
          fallbackCityCode: cityCodeFromName,
          bootstrapSource: 'location_name',
          geoDenied,
        },
      }
    }
  }

  const senderCityCode =
    params.senderCityCode != null &&
    Number.isFinite(params.senderCityCode) &&
    params.senderCityCode > 0
      ? Math.trunc(params.senderCityCode)
      : null
  if (senderCityCode != null) {
    return {
      geoRegion: null,
      bootstrap: {
        regionCode: null,
        fallbackCityCode: senderCityCode,
        bootstrapSource: 'sender_city',
        geoDenied,
      },
    }
  }

  return {
    geoRegion: null,
    bootstrap: {
      regionCode: null,
      fallbackCityCode: null,
      bootstrapSource: 'country',
      geoDenied,
    },
  }
}

export function buildCdekWidgetServicePath(params: {
  brandId?: BrandId
  regionCode?: number | null
  fallbackCityCode?: number | null
}): string {
  const searchParams = new URLSearchParams()
  if (params.brandId) searchParams.set('brand', params.brandId)
  if (params.regionCode != null && params.regionCode > 0) {
    searchParams.set('widget_offices_scope', 'region')
    searchParams.set('region_code', String(params.regionCode))
  } else if (params.fallbackCityCode != null && params.fallbackCityCode > 0) {
    searchParams.set('city_code', String(params.fallbackCityCode))
  }

  const query = searchParams.toString()
  return query ? `/api/cdek-widget/service?${query}` : '/api/cdek-widget/service'
}

export function shouldExpandCountryOfficesAfterInit(params: {
  regionCode?: number | null
  fallbackCityCode?: number | null
}): boolean {
  if (params.regionCode != null && params.regionCode > 0) return true
  if (params.fallbackCityCode != null && params.fallbackCityCode > 0) return true
  return false
}
