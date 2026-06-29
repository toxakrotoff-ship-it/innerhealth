import type { BrandId } from '@/lib/brand/brand'
import { OFFICES_PAGE_SIZE } from '@/lib/cdek-widget-offices'

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

export async function fetchCountryOfficesRaw(params: {
  brandId?: BrandId
  signal?: AbortSignal
}): Promise<unknown[]> {
  const serviceUrl = buildCdekWidgetServiceUrl(params.brandId)

  const probeResponse = await fetch(serviceUrl, {
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

  const totalElements = parseOfficesTotalElements(probeResponse)
  if (totalElements <= OFFICES_PAGE_SIZE) {
    return fetchOfficesPage({ serviceUrl, page: 0, signal: params.signal })
  }

  const pageCount = Math.ceil(totalElements / OFFICES_PAGE_SIZE)
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, page) =>
      fetchOfficesPage({ serviceUrl, page, signal: params.signal })
    )
  )

  return pages.flat()
}
