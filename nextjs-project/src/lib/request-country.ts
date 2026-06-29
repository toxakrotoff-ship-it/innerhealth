import 'server-only'

import { headers } from 'next/headers'

const RUSSIA_COUNTRY_CODE = 'RU'

type GeoipLookupResult = {
  country?: string
} | null

type GeoipModule = {
  lookup: (ip: string) => GeoipLookupResult
}

let geoipModulePromise: Promise<GeoipModule> | null = null

function normalizeCountryCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase()
  if (!normalized || normalized === 'UNKNOWN' || normalized === 'XX') return null
  return normalized
}

function isLocalHost(host: string | null): boolean {
  if (!host) return false
  const normalized = host.trim().toLowerCase()
  return (
    normalized.startsWith('localhost') ||
    normalized.startsWith('127.0.0.1') ||
    normalized.startsWith('0.0.0.0') ||
    normalized === 'app' ||
    normalized.startsWith('app:')
  )
}

function isNextProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

function getClientIpFromHeaders(headerStore: Headers): string | null {
  const forwarded = headerStore.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip')?.trim() ??
    null

  if (!ip || ip === 'unknown') return null
  return ip
}

async function loadGeoipModule(): Promise<GeoipModule | null> {
  if (isNextProductionBuildPhase()) return null

  if (!geoipModulePromise) {
    geoipModulePromise = import('geoip-lite').then((module) => {
      const geoip = module.default ?? module
      return geoip as GeoipModule
    })
  }

  try {
    return await geoipModulePromise
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[request-country] Failed to load geoip-lite:', error)
    }
    geoipModulePromise = null
    return null
  }
}

async function lookupCountryByIp(ip: string): Promise<string | null> {
  const geoip = await loadGeoipModule()
  if (!geoip) return null

  try {
    const lookup = geoip.lookup(ip)
    return normalizeCountryCode(lookup?.country ?? null)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[request-country] GeoIP lookup failed:', error)
    }
    return null
  }
}

export function isVpnNoticeEnabled(): boolean {
  const raw = process.env.VPN_NOTICE_ENABLED?.trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false
  return true
}

/**
 * ISO 3166-1 alpha-2 country code for the current request.
 * Lookup is done in-app via bundled GeoIP database (`geoip-lite`).
 * Dev override: `VPN_NOTICE_DEV_COUNTRY=US` on localhost in non-production.
 */
export async function getRequestCountryCode(): Promise<string | null> {
  if (isNextProductionBuildPhase()) return null

  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host')

  if (isLocalHost(host) && process.env.NODE_ENV !== 'production') {
    return normalizeCountryCode(process.env.VPN_NOTICE_DEV_COUNTRY)
  }

  const clientIp = getClientIpFromHeaders(headerStore)
  if (!clientIp) return null

  return lookupCountryByIp(clientIp)
}

export async function shouldShowVpnNotice(): Promise<boolean> {
  if (isNextProductionBuildPhase()) return false
  if (!isVpnNoticeEnabled()) return false

  const countryCode = await getRequestCountryCode()
  if (!countryCode) return false

  return countryCode !== RUSSIA_COUNTRY_CODE
}
