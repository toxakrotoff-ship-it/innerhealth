import { CDN_URL } from '@/lib/cdn'
import type { CdekPvzManifest } from '@/lib/cdek-pvz-types'

async function fetchJson(url: string, options: { noStore?: boolean; signal?: AbortSignal } = {}): Promise<unknown> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (options.signal?.aborted) abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, 3_000)
  try {
    const response = await fetch(url, {
      ...(options.noStore ? { cache: 'no-store' as const } : {}),
      credentials: 'omit',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`PVZ request failed: ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}

/** Always read the pointer from origin: CDN/browser TTL must never delay a nightly release. */
export async function fetchCdekPvzManifest(signal?: AbortSignal): Promise<CdekPvzManifest | null> {
  if (!CDN_URL) return null
  try {
    const value = await fetchJson('/api/cdek-pvz/manifest', { noStore: true, signal })
    if (!value || typeof value !== 'object') return null
    const manifest = value as CdekPvzManifest
    if (manifest.schemaVersion !== 1 || typeof manifest.publishedAt !== 'string' ||
      !manifest.regions || typeof manifest.regions !== 'object' || Array.isArray(manifest.regions)) return null
    const entries = Object.entries(manifest.regions)
    if (!entries.length || entries.some(([region, entry]) =>
      !/^[1-9]\d*$/.test(region) || !entry ||
      typeof entry.path !== 'string' ||
      !new RegExp(`^/api/cdek-pvz/regions/[a-f0-9]{64}/${region}\\.json$`).test(entry.path) ||
      !Number.isSafeInteger(entry.totalCount) || entry.totalCount < 0
    )) return null
    return manifest
  } catch {
    return null
  }
}

export async function fetchCdekPvzRegion(
  manifest: CdekPvzManifest,
  regionCode: number,
  signal?: AbortSignal,
): Promise<unknown[]> {
  const entry = manifest.regions[String(regionCode)]
  if (!entry) throw new Error('PVZ region is not published')
  const payload = await fetchJson(`${CDN_URL}${entry.path}`, { signal })
  if (!Array.isArray(payload) || payload.length !== entry.totalCount) {
    throw new Error('Incomplete PVZ region snapshot')
  }
  return payload
}
