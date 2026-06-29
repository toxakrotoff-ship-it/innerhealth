import 'server-only'

import { headers } from 'next/headers'
import geoip from 'geoip-lite'

const RUSSIA_COUNTRY_CODE = 'RU'

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

function getClientIpFromHeaders(headerStore: Headers): string | null {
  const forwarded = headerStore.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip')?.trim() ??
    null

  if (!ip || ip === 'unknown') return null
  return ip
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
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host')

  if (isLocalHost(host) && process.env.NODE_ENV !== 'production') {
    return normalizeCountryCode(process.env.VPN_NOTICE_DEV_COUNTRY)
  }

  const clientIp = getClientIpFromHeaders(headerStore)
  if (!clientIp) return null

  const lookup = geoip.lookup(clientIp)
  return normalizeCountryCode(lookup?.country ?? null)
}

export async function shouldShowVpnNotice(): Promise<boolean> {
  if (!isVpnNoticeEnabled()) return false

  const countryCode = await getRequestCountryCode()
  if (!countryCode) return false

  return countryCode !== RUSSIA_COUNTRY_CODE
}
