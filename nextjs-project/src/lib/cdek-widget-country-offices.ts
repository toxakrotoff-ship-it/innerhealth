import type { BrandId } from '@/lib/brand/brand'
import { OFFICES_PAGE_SIZE } from '@/lib/cdek-widget-offices'

export const COUNTRY_OFFICES_MOBILE_CONCURRENCY = 2
export const COUNTRY_OFFICES_DESKTOP_CONCURRENCY = 4

export interface CountryOfficesBatchMeta {
  page: number
  pageCount: number
  batchSize: number
  totalLoaded: number
  isComplete: boolean
}

export interface FetchCountryOfficesStagedOptions {
  brandId?: BrandId
  signal?: AbortSignal
  concurrency?: number
  onBatch?: (payload: {
    batch: unknown[]
    accumulated: unknown[]
    meta: CountryOfficesBatchMeta
  }) => void | Promise<void>
}

function buildCdekWidgetServiceUrl(brandId?: BrandId): string {
  if (!brandId) return '/api/cdek-widget/service'
  return `/api/cdek-widget/service?brand=${encodeURIComponent(brandId)}`
}

function parseOfficesTotalElements(response: Response): number {
  const raw = response.headers.get('x-total-elements')
  if (!raw) return 0
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
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
  const probeResponse = await fetch(params.serviceUrl, {
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

  if (!probeResponse.ok) {
    throw new Error(`CDEK country offices probe failed: ${probeResponse.status}`)
  }

  return parseOfficesTotalElements(probeResponse)
}

export async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  concurrency: number,
  worker: (item: TItem, index: number) => Promise<TResult>,
  signal?: AbortSignal
): Promise<TResult[]> {
  if (items.length === 0) return []

  const results = new Array<TResult>(items.length)
  let cursor = 0

  async function consume(): Promise<void> {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted', 'AbortError')
      }

      const index = cursor
      cursor += 1
      if (index >= items.length) return

      results[index] = await worker(items[index]!, index)
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length)
  await Promise.all(Array.from({ length: workerCount }, () => consume()))
  return results
}

export async function fetchCountryOfficesStaged(
  options: FetchCountryOfficesStagedOptions
): Promise<unknown[]> {
  const serviceUrl = buildCdekWidgetServiceUrl(options.brandId)
  const concurrency = Math.max(1, options.concurrency ?? COUNTRY_OFFICES_DESKTOP_CONCURRENCY)
  const totalElements = await probeCountryOfficesTotal({
    serviceUrl,
    signal: options.signal,
  })

  if (totalElements <= OFFICES_PAGE_SIZE) {
    const offices = await fetchOfficesPage({ serviceUrl, page: 0, signal: options.signal })
    await options.onBatch?.({
      batch: offices,
      accumulated: offices,
      meta: {
        page: 0,
        pageCount: 1,
        batchSize: offices.length,
        totalLoaded: offices.length,
        isComplete: true,
      },
    })
    return offices
  }

  const pageCount = Math.ceil(totalElements / OFFICES_PAGE_SIZE)
  const firstPage = await fetchOfficesPage({ serviceUrl, page: 0, signal: options.signal })
  const accumulated: unknown[] = [...firstPage]

  await options.onBatch?.({
    batch: firstPage,
    accumulated,
    meta: {
      page: 0,
      pageCount,
      batchSize: firstPage.length,
      totalLoaded: accumulated.length,
      isComplete: pageCount === 1,
    },
  })

  if (pageCount === 1) return accumulated

  const remainingPages = Array.from({ length: pageCount - 1 }, (_, index) => index + 1)
  const pageResults = await mapWithConcurrency(
    remainingPages,
    concurrency,
    async (page) => ({
      page,
      offices: await fetchOfficesPage({ serviceUrl, page, signal: options.signal }),
    }),
    options.signal
  )

  pageResults
    .sort((left, right) => left.page - right.page)
    .forEach(({ page, offices }) => {
      accumulated.push(...offices)
    })

  await options.onBatch?.({
    batch: [],
    accumulated,
    meta: {
      page: pageCount - 1,
      pageCount,
      batchSize: 0,
      totalLoaded: accumulated.length,
      isComplete: true,
    },
  })

  return accumulated
}

export async function fetchCountryOfficesRaw(params: {
  brandId?: BrandId
  signal?: AbortSignal
  concurrency?: number
}): Promise<unknown[]> {
  return fetchCountryOfficesStaged({
    brandId: params.brandId,
    signal: params.signal,
    concurrency: params.concurrency ?? COUNTRY_OFFICES_DESKTOP_CONCURRENCY,
  })
}
