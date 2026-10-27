import type { BrandId } from '@/lib/brand/brand'
import { CDN_URL } from '@/lib/cdn'
import { normalizeOzonPvzCity } from '@/lib/ozon-pvz-city'
import { ozonAddressSearchWords, ozonCitySearchName } from '@/lib/ozon-delivery/search'
import type { OzonPublicPoint, OzonPvzCityManifest } from '@/lib/ozon-pvz-types'

const FRESH_MS = 48 * 60 * 60 * 1000
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000
const SNAPSHOT_CACHE_LIMIT = 16
const snapshots = new Map<string, OzonPublicPoint[]>()

interface SearchOptions {
  brandId?: BrandId
  city: string
  query?: string
  suggestCities?: boolean
  view?: 'map' | 'list'
  signal?: AbortSignal
}

export interface OzonPointSearchResult {
  cities?: string[]
  points: OzonPublicPoint[]
  hasMore: boolean
  mapApiKey?: string
}

function publicPoint({ id, name, address, coordinates }: OzonPublicPoint): OzonPublicPoint {
  const validCoordinates = coordinates && Number.isFinite(coordinates.latitude) && Math.abs(coordinates.latitude) <= 90 &&
    Number.isFinite(coordinates.longitude) && Math.abs(coordinates.longitude) <= 180
  return { id, name, address, ...(validCoordinates ? { coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude } } : {}) }
}

function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Ozon point search cancelled', 'AbortError')
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function fresh(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp >= Date.now() - FRESH_MS && timestamp <= Date.now() + CLOCK_TOLERANCE_MS
}

function validPoint(value: unknown): value is OzonPublicPoint {
  return record(value) && Number.isSafeInteger(value.id) && Number(value.id) > 0 &&
    typeof value.name === 'string' && typeof value.address === 'string'
}

function validManifest(value: unknown, options: SearchOptions): value is OzonPvzCityManifest {
  if (!record(value) || value.schemaVersion !== 1 || !fresh(value.publishedAt) ||
    typeof value.brand !== 'string' || !['inner', 'sprint-power'].includes(value.brand) ||
    (options.brandId && value.brand !== options.brandId) ||
    value.city !== normalizeOzonPvzCity(options.city) ||
    typeof value.cityKey !== 'string' || !/^[a-f0-9]{64}$/.test(value.cityKey) ||
    !record(value.entry)) return false
  const entry = value.entry
  return typeof entry.path === 'string' &&
    new RegExp(`^/api/ozon-pvz/cities/${value.brand}/[a-f0-9]{64}/${value.cityKey}\\.json$`).test(entry.path) &&
    Number.isSafeInteger(entry.totalCount) && Number(entry.totalCount) >= 0 && fresh(entry.updatedAt)
}

/** Bound the whole request, including body parsing, even if a fetch implementation ignores abort. */
async function fetchJson(url: string, options: {
  signal?: AbortSignal
  noStore?: boolean
  timeoutMs?: number
  expectedHash?: string
  originErrors?: boolean
}): Promise<unknown> {
  checkCancelled(options.signal)
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  let rejectCancellation: (reason: Error) => void = () => {}
  const cancellation = new Promise<never>((_, reject) => { rejectCancellation = reject })
  const abort = () => {
    controller.abort()
    rejectCancellation(new DOMException('Ozon point search cancelled', 'AbortError'))
  }
  options.signal?.addEventListener('abort', abort, { once: true })
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error('Не удалось дождаться ответа сервиса пунктов выдачи Ozon'))
    }, options.timeoutMs ?? 3000)
  })
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(url, {
          ...(options.noStore ? { cache: 'no-store' as const } : {}),
          credentials: 'omit', signal: controller.signal,
        })
        if (!response.ok) {
          if (options.originErrors) {
            const body = await response.json().catch(() => null)
            if (record(body) && typeof body.error === 'string') throw new Error(body.error)
          }
          throw new Error('Не удалось загрузить пункты выдачи Ozon')
        }
        if (options.expectedHash) {
          const bytes = await response.arrayBuffer()
          const digest = await crypto.subtle.digest('SHA-256', bytes)
          const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
          if (hash !== options.expectedHash) throw new Error('Invalid Ozon city snapshot hash')
          return JSON.parse(new TextDecoder().decode(bytes)) as unknown
        }
        return await response.json()
      })(),
      timeout,
      cancellation,
    ])
  } finally {
    if (timer) clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}

function searchUrl(path: string, options: SearchOptions, includeQuery: boolean): string {
  const params = new URLSearchParams({ city: options.city.trim() })
  if (includeQuery && options.suggestCities) params.set('suggestCities', 'true')
  if (includeQuery && options.view === 'map') params.set('view', 'map')
  if (includeQuery && options.query?.trim()) params.set('query', options.query.trim())
  if (options.brandId) params.set('brand', options.brandId)
  return `${path}?${params}`
}

async function originSearch(options: SearchOptions): Promise<OzonPointSearchResult> {
  checkCancelled(options.signal)
  const data = await fetchJson(searchUrl('/api/ozon-delivery/points', options, true), {
    signal: options.signal, noStore: true, timeoutMs: 8000, originErrors: true,
  })
  checkCancelled(options.signal)
  if (!record(data) || !Array.isArray(data.points) || !data.points.every(validPoint)) {
    throw new Error('Не удалось загрузить пункты выдачи Ozon')
  }
  return {
    ...(Array.isArray(data.cities) ? { cities: data.cities.filter((city): city is string => typeof city === 'string' && city.length >= 2 && city.length <= 100) } : {}),
    points: (options.view === 'map' ? data.points : data.points.slice(0, 30)).map(publicPoint),
    hasMore: options.view === 'map' ? false : data.hasMore === true || data.points.length > 30,
    ...(typeof data.mapApiKey === 'string' ? { mapApiKey: data.mapApiKey } : {}),
  }
}

/** Revalidate the release pointer on every search; immutable city versions can be reused locally. */
export async function searchOzonPoints(options: SearchOptions): Promise<OzonPointSearchResult> {
  checkCancelled(options.signal)
  if (options.suggestCities) return originSearch(options)
  options = { ...options, city: ozonCitySearchName(options.city) }
  if (!CDN_URL) return originSearch(options)
  try {
    const manifest = await fetchJson(searchUrl('/api/ozon-pvz/manifest', options, false), { signal: options.signal, noStore: true })
    if (!validManifest(manifest, options)) throw new Error('Ozon city snapshot is not available')
    const path = manifest.entry!.path
    let points = snapshots.get(path)
    if (!points) {
      const hash = path.split('/')[5]
      const payload = await fetchJson(`${CDN_URL}${path}`, { signal: options.signal, expectedHash: hash })
      if (!Array.isArray(payload) || payload.length !== manifest.entry!.totalCount || !payload.every(validPoint)) {
        throw new Error('Invalid Ozon city snapshot')
      }
      points = payload.map(publicPoint)
      checkCancelled(options.signal)
    }
    // Count must agree even on cache hits: a malformed new pointer must not authorize old data.
    if (points.length !== manifest.entry!.totalCount) throw new Error('Invalid Ozon city snapshot count')
    snapshots.delete(path)
    snapshots.set(path, points)
    if (snapshots.size > SNAPSHOT_CACHE_LIMIT) snapshots.delete(snapshots.keys().next().value!)
    checkCancelled(options.signal)
    const words = ozonAddressSearchWords(options.query ?? '')
    const matches = words.length ? points.filter(point => {
      const address = point.address.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
      return words.every(word => address.includes(word))
    }) : points
    return { points: options.view === 'map' ? matches : matches.slice(0, 30), hasMore: options.view === 'map' ? false : matches.length > 30,
      ...(typeof manifest.mapApiKey === 'string' ? { mapApiKey: manifest.mapApiKey } : {}),
    }
  } catch {
    checkCancelled(options.signal)
    return originSearch(options)
  }
}
