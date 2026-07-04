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

export const WIDGET_GEO_TOTAL_BUDGET_MS = 12_000
export const WIDGET_GEO_RESOLVE_BUDGET_MS = 10_000
export const WIDGET_GEO_API_TIMEOUT_MS = 8_000

/** CDEK widget `.mobile` layout class — container width threshold. */
export const CDEK_WIDGET_LAYOUT_BREAKPOINT_PX = 555

/** @deprecated Use CDEK_WIDGET_LAYOUT_BREAKPOINT_PX */
export const CDEK_WIDGET_MOBILE_BREAKPOINT_PX = CDEK_WIDGET_LAYOUT_BREAKPOINT_PX

/** Aligns with globals.css `@media (max-width: 767px)` mobile fixes. */
export const CDEK_WIDGET_MOBILE_CLIENT_MAX_WIDTH_PX = 767

/** Touch phones in landscape (e.g. iPhone 844px wide). */
export const CDEK_WIDGET_TOUCH_LANDSCAPE_MAX_WIDTH_PX = 932

export function extractCityFromSenderAddress(address: string | null | undefined): string | null {
  const trimmed = address?.trim()
  if (!trimmed) return null
  const cityPart = trimmed.split(',')[0]?.trim()
  return cityPart && cityPart.length > 0 ? cityPart : null
}

export function isCdekWidgetNarrowLayout(containerWidth: number): boolean {
  return containerWidth > 0 && containerWidth < CDEK_WIDGET_LAYOUT_BREAKPOINT_PX
}

/** @deprecated Use isCdekWidgetNarrowLayout for layout or isCdekWidgetMobileClient for behavior. */
export function isCdekWidgetMobileViewport(viewportWidth?: number): boolean {
  if (viewportWidth != null) return isCdekWidgetNarrowLayout(viewportWidth)
  if (typeof window === 'undefined') return false
  return isCdekWidgetNarrowLayout(window.innerWidth)
}

export function isCdekWidgetMobileClient(params?: {
  containerWidth?: number
  matchMedia?: (query: string) => { matches: boolean }
}): boolean {
  if (typeof window === 'undefined') return false

  const media =
    params?.matchMedia ??
    ((query: string) => window.matchMedia(query))

  if (media(`(max-width: ${CDEK_WIDGET_MOBILE_CLIENT_MAX_WIDTH_PX}px)`).matches) {
    return true
  }

  if (
    media('(hover: none) and (pointer: coarse)').matches &&
    media(`(max-width: ${CDEK_WIDGET_TOUCH_LANDSCAPE_MAX_WIDTH_PX}px)`).matches
  ) {
    return true
  }

  const containerWidth = params?.containerWidth ?? 0
  if (containerWidth > 0 && containerWidth < CDEK_WIDGET_LAYOUT_BREAKPOINT_PX) {
    return true
  }

  return false
}

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
  totalBudgetMs?: number
}): Promise<{ geoRegion: WidgetGeoRegion | null; geoDenied: boolean }> {
  const totalBudgetMs = params.totalBudgetMs ?? WIDGET_GEO_TOTAL_BUDGET_MS
  const geolocationBudgetMs = Math.min(
    params.geolocationBudgetMs ?? WIDGET_GEO_RESOLVE_BUDGET_MS,
    totalBudgetMs
  )
  const startedAt = Date.now()
  const geolocation = await readBrowserGeolocationDetailed(geolocationBudgetMs)
  if (!geolocation.coords) {
    return {
      geoRegion: null,
      geoDenied: geolocation.failureReason === 'denied',
    }
  }

  const remainingBudgetMs = Math.max(0, totalBudgetMs - (Date.now() - startedAt))
  const geoApiTimeoutMs = Math.min(
    params.geoApiTimeoutMs ?? WIDGET_GEO_API_TIMEOUT_MS,
    remainingBudgetMs
  )

  const geoRegion = await resolveWidgetGeoRegion({
    brandId: params.brandId,
    coords: geolocation.coords,
    geoApiTimeoutMs: geoApiTimeoutMs > 0 ? geoApiTimeoutMs : 1,
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

export function readWidgetSenderCityFromConfig(from: unknown): string | null {
  if (!from || typeof from !== 'object') return null
  const row = from as { city?: unknown; address?: unknown }
  if (typeof row.city === 'string' && row.city.trim().length > 0) {
    return row.city.trim()
  }
  if (typeof row.address === 'string' && row.address.trim().length > 0) {
    return extractCityFromSenderAddress(row.address)
  }
  return null
}

export function resolveWidgetDefaultLocation(params: {
  defaultLocation?: string | null
  geoRegion?: WidgetGeoRegion | null
  configFrom?: unknown
}): string {
  const explicit = params.defaultLocation?.trim()
  if (explicit) return explicit

  const fromGeo = params.geoRegion?.defaultLocation?.trim()
  if (fromGeo) return fromGeo

  const fromGeoCity = params.geoRegion?.city?.trim()
  if (fromGeoCity) return fromGeoCity

  const fromSender = readWidgetSenderCityFromConfig(params.configFrom)
  if (fromSender) return fromSender

  return 'Россия'
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
  bootstrapSource?: WidgetOfficesBootstrapSource | null
  /** Skip background country load on mobile after geo_region bootstrap to avoid map jank. */
  isMobileClient?: boolean
}): boolean {
  const hasRegionBootstrap = params.regionCode != null && params.regionCode > 0
  const hasCityBootstrap = params.fallbackCityCode != null && params.fallbackCityCode > 0
  if (!hasRegionBootstrap && !hasCityBootstrap) return false

  if (
    params.isMobileClient &&
    params.bootstrapSource === 'geo_region' &&
    hasRegionBootstrap
  ) {
    return false
  }

  return true
}
