import type { BrandId } from '@/lib/brand/brand'
import { OFFICES_PAGE_SIZE } from '@/lib/cdek-widget-offices'
import { readCountryOfficesCache, writeCountryOfficesCache } from '@/lib/cdek-widget-offices-client-cache'
import { CDN_URL } from '@/lib/cdn'
import { fetchCdekPvzManifest, fetchCdekPvzRegion } from '@/lib/cdek-pvz-client'
import type { CdekPvzManifest } from '@/lib/cdek-pvz-types'

/** Batches between map updates: regional CDN files or API pages (500 PVZ/page). */
export const COUNTRY_OFFICES_EXPAND_APPLY_EVERY_PAGES = 3
export const COUNTRY_OFFICES_EXPAND_BATCH_PAUSE_MS = 500

export interface CountryOfficesBatchMeta {
  page: number
  pageCount: number
  batchSize: number
  totalLoaded: number
  isComplete: boolean
  shouldApply: boolean
}

function buildCdekWidgetServiceUrl(brandId?: BrandId): string {
  if (!brandId) return '/api/cdek-widget/service'
  return `/api/cdek-widget/service?brand=${encodeURIComponent(brandId)}`
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('The operation was aborted', 'AbortError'))
    }
    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function shouldApplyAfterPage(page: number, pageCount: number, applyEveryPages: number): boolean {
  const isComplete = page === pageCount - 1
  if (isComplete) return true
  return (page + 1) % applyEveryPages === 0
}

async function fetchOfficesPage(params: {
  serviceUrl: string
  page: number
  signal?: AbortSignal
}): Promise<unknown[]> {
  const response = await fetch(params.serviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'offices',
      offices_scope: 'country',
      is_handout: true,
      page: params.page,
      size: OFFICES_PAGE_SIZE,
    }),
    signal: params.signal,
  })

  if (!response.ok) {
    throw new Error(`CDEK country offices page ${params.page} failed: ${response.status}`)
  }

  const data = (await response.json()) as unknown
  return Array.isArray(data) ? data : []
}

async function probeCountryOfficesTotal(params: {
  serviceUrl: string
  signal?: AbortSignal
}): Promise<number> {
  const response = await fetch(params.serviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'offices',
      offices_scope: 'country',
      is_handout: true,
      page: 1,
      size: 1,
    }),
    signal: params.signal,
  })

  if (!response.ok) {
    throw new Error(`CDEK country offices probe failed: ${response.status}`)
  }

  const raw = response.headers.get('x-total-elements')
  if (!raw) return 0
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export async function fetchCountryOfficesStaged(params: {
  brandId?: BrandId
  signal?: AbortSignal
  applyEveryPages?: number
  batchPauseMs?: number
  manifest?: CdekPvzManifest | null
  priorityRegionCode?: number | null
  onBatch?: (payload: {
    batch: unknown[]
    accumulated: unknown[]
    meta: CountryOfficesBatchMeta
  }) => void | Promise<void>
}): Promise<unknown[]> {
  const serviceUrl = buildCdekWidgetServiceUrl(params.brandId)
  const applyEveryPages = Math.max(1, params.applyEveryPages ?? 1)
  const batchPauseMs = params.batchPauseMs ?? COUNTRY_OFFICES_EXPAND_BATCH_PAUSE_MS
  const manifest = params.manifest === undefined ? await fetchCdekPvzManifest(params.signal) : params.manifest
  if (params.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError')
  if (manifest) {
    try {
      const priorityRegion = String(params.priorityRegionCode)
      const regions = Object.keys(manifest.regions).filter(region => region !== priorityRegion)
      if (manifest.regions[priorityRegion]) regions.unshift(priorityRegion)
      const accumulated: unknown[] = []
      for (let page = 0; page < regions.length; page += 1) {
        const batch = await fetchCdekPvzRegion(manifest, Number(regions[page]), params.signal)
        accumulated.push(...batch)
        const isComplete = page === regions.length - 1
        if (params.onBatch && shouldApplyAfterPage(page, regions.length, applyEveryPages)) {
          await params.onBatch({ batch, accumulated, meta: {
            page, pageCount: regions.length, batchSize: batch.length,
            totalLoaded: accumulated.length, isComplete, shouldApply: true,
          } })
          if (!isComplete) await pause(batchPauseMs, params.signal)
        }
      }
      return accumulated
    } catch (error) {
      if (params.signal?.aborted) throw error
      // Restart from the existing country API on CDN errors, replacing partial batches.
    }
  }
  const totalElements = await probeCountryOfficesTotal({
    serviceUrl,
    signal: params.signal,
  })

  const pageCount = Math.max(1, Math.ceil(totalElements / OFFICES_PAGE_SIZE))
  const accumulated: unknown[] = []

  for (let page = 0; page < pageCount; page += 1) {
    const batch = await fetchOfficesPage({ serviceUrl, page, signal: params.signal })
    accumulated.push(...batch)

    const isComplete = page === pageCount - 1
    const shouldApply = shouldApplyAfterPage(page, pageCount, applyEveryPages)

    if (params.onBatch && shouldApply) {
      await params.onBatch({
        batch,
        accumulated,
        meta: {
          page,
          pageCount,
          batchSize: batch.length,
          totalLoaded: accumulated.length,
          isComplete,
          shouldApply: true,
        },
      })
      if (!isComplete) {
        await pause(batchPauseMs, params.signal)
      }
    }
  }

  return accumulated
}

// Keyed by brandId so a component remount (e.g. user navigates /cart -> /product -> /cart
// mid-download) joins the already-running country-wide fetch instead of restarting it from
// page 0. Without this, every remount paid the full ~25-request, multi-MB download again —
// the sessionStorage cache in cdek-widget-offices-client-cache.ts only helps once a download
// has fully *completed*, which a remount-triggered abort used to prevent it from ever doing.
const inFlightCountryOfficesExpansions = new Map<string, Promise<unknown[]>>()

async function runCountryOfficesExpansion(params: {
  brandId?: BrandId
  applyEveryPages?: number
  batchPauseMs?: number
  manifest: CdekPvzManifest | null
  priorityRegionCode?: number | null
  applyOffices: (offices: unknown[]) => Promise<void>
}): Promise<unknown[]> {
  let totalLoaded = 0
  let accumulatedOffices: unknown[] = []

  await fetchCountryOfficesStaged({
    brandId: params.brandId,
    manifest: params.manifest,
    priorityRegionCode: params.priorityRegionCode,
    applyEveryPages: params.applyEveryPages ?? COUNTRY_OFFICES_EXPAND_APPLY_EVERY_PAGES,
    batchPauseMs: params.batchPauseMs ?? COUNTRY_OFFICES_EXPAND_BATCH_PAUSE_MS,
    onBatch: async ({ accumulated, meta }) => {
      if (!meta.shouldApply) return
      totalLoaded = meta.totalLoaded
      accumulatedOffices = accumulated
      await params.applyOffices(accumulated)
    },
  })

  if (totalLoaded > 0) writeCountryOfficesCache(accumulatedOffices, params.manifest?.publishedAt)

  return accumulatedOffices
}

export async function expandCountryOfficesIntoWidget(params: {
  brandId?: BrandId
  signal?: AbortSignal
  applyEveryPages?: number
  batchPauseMs?: number
  priorityRegionCode?: number | null
  applyOffices: (offices: unknown[]) => Promise<void>
}): Promise<number> {
  const manifest = await fetchCdekPvzManifest(params.signal)
  if (params.signal?.aborted) throw new DOMException('The operation was aborted', 'AbortError')
  // When the origin pointer is unavailable, use API rather than an unverified CDN-era cache.
  const cached = manifest || !CDN_URL ? readCountryOfficesCache(manifest?.publishedAt) : null
  if (cached) {
    await params.applyOffices(cached)
    return cached.length
  }

  const key = `${params.brandId ?? 'default'}|${manifest?.publishedAt ?? 'api'}`
  const existing = inFlightCountryOfficesExpansions.get(key)
  if (existing) {
    const offices = await existing
    await params.applyOffices(offices)
    return offices.length
  }

  const task = runCountryOfficesExpansion({ ...params, manifest })
  inFlightCountryOfficesExpansions.set(key, task)
  try {
    const offices = await task
    return offices.length
  } finally {
    inFlightCountryOfficesExpansions.delete(key)
  }
}

export async function fetchCountryOfficesForWidget(params: {
  brandId?: BrandId
  signal?: AbortSignal
}): Promise<unknown[]> {
  return fetchCountryOfficesStaged({
    brandId: params.brandId,
    signal: params.signal,
  })
}
