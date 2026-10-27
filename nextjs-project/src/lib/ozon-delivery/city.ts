import 'server-only'
import { isIP } from 'node:net'
import type { BrandId } from '@/lib/brand/brand'
import { getYandexMapsApiKey } from '@/services/settings.service'
import { reverseGeocodeYandexCoordinates } from '@/lib/cdek-yandex-reverse-geocode'

const cities = new Map<string, { city: string | null; expires: number }>()

/** Approximate IP city; the customer's explicit checkout choice always takes precedence. */
export async function detectOzonCity(request: Request, brand: BrandId): Promise<string | null> {
  const ip = (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || '').trim().replace(/^::ffff:/i, '')
  if (!isIP(ip)) return null
  try {
    const geoip = (await import('geoip-lite')).default
    const geo = geoip.lookup(ip)
    if (!geo || geo.country !== 'RU' || !geo.ll?.every(Number.isFinite)) return null
    const [latitude, longitude] = geo.ll
    // Cache by approximate location and storefront, without retaining client IPs.
    const key = `${brand}:${latitude}:${longitude}`
    const cached = cities.get(key)
    if (cached && cached.expires > Date.now()) return cached.city
    const apiKey = await getYandexMapsApiKey({ brandId: brand })
    if (!apiKey) return null
    const result = await reverseGeocodeYandexCoordinates({ latitude, longitude, apiKey, signal: AbortSignal.timeout(4_000) })
    const city = result?.locality?.trim() || null
    if (cities.size >= 256) cities.delete(cities.keys().next().value!)
    cities.set(key, { city, expires: Date.now() + (city ? 6 * 3600_000 : 30_000) })
    return city
  } catch { return null }
}

/** Match a complete comma-delimited locality, rather than a street in another city. */
export function ozonCityAddressPattern(city: string): string {
  const name = city.trim().replace(/^(?:город\s+|г\.\s*|г\s+)/i, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[её]/gi, '[её]')
  return `(^|,)[[:space:]]*((г[.]?|город)[[:space:]]*)?${name}[[:space:]]*(,|$)`
}
