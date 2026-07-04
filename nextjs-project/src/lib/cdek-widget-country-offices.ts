import type { BrandId } from '@/lib/brand/brand'
import { OFFICES_PAGE_SIZE } from '@/lib/cdek-widget-offices'

/** Pages fetched between widget map updates (~1500 PVZ at 500/page). */
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
  onBatch?: (payload: {
    batch: unknown[]
    accumulated: unknown[]
    meta: CountryOfficesBatchMeta
  }) => void | Promise<void>
}): Promise<unknown[]> {
  const serviceUrl = buildCdekWidgetServiceUrl(params.brandId)
  const applyEveryPages = Math.max(1, params.applyEveryPages ?? 1)
  const batchPauseMs = params.batchPauseMs ?? COUNTRY_OFFICES_EXPAND_BATCH_PAUSE_MS
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

export async function expandCountryOfficesIntoWidget(params: {
  brandId?: BrandId
  signal?: AbortSignal
  applyOffices: (offices: unknown[]) => Promise<void>
}): Promise<number> {
  let totalLoaded = 0

  await fetchCountryOfficesStaged({
    brandId: params.brandId,
    signal: params.signal,
    applyEveryPages: COUNTRY_OFFICES_EXPAND_APPLY_EVERY_PAGES,
    batchPauseMs: COUNTRY_OFFICES_EXPAND_BATCH_PAUSE_MS,
    onBatch: async ({ accumulated, meta }) => {
      if (!meta.shouldApply) return
      totalLoaded = meta.totalLoaded
      await params.applyOffices(accumulated)
    },
  })

  return totalLoaded
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
