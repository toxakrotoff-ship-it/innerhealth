export const OFFICES_PAGE_SIZE = 500
export const OFFICES_MAX_PAGES = 40
const DEFAULT_OFFICES_CITY_CODE = 44

export type CdekOfficesScope = 'local' | 'region' | 'country'

function parseOptionalInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function hasWidgetOfficesCityFilter(data: Record<string, unknown>): boolean {
  const cityCode = parseOptionalInt(data.city_code ?? data.cityCode ?? data.code)
  if (cityCode != null && cityCode > 0) return true

  const cityUuid =
    typeof data.city_uuid === 'string'
      ? data.city_uuid.trim()
      : typeof data.cityUuid === 'string'
        ? data.cityUuid.trim()
        : ''
  if (cityUuid.length > 0) return true

  const postalCode =
    typeof data.postal_code === 'string'
      ? data.postal_code.trim()
      : typeof data.postalCode === 'string'
        ? data.postalCode.trim()
        : ''
  if (postalCode.length > 0) return true

  const regionCode = parseOptionalInt(data.region_code ?? data.regionCode)
  return regionCode != null && regionCode > 0
}

export function isWidgetOfficesProbeRequest(data: Record<string, unknown>): boolean {
  const page = parseOptionalInt(data.page)
  const size = parseOptionalInt(data.size)
  return page === 1 && size === 1
}

export function isWidgetOfficesBulkDumpRequest(data: Record<string, unknown>): boolean {
  const page = parseOptionalInt(data.page)
  if (page !== 0) return false
  const size = data.size
  return size === null || size === undefined || size === ''
}

export function isWidgetCountryHandoutRequest(data: Record<string, unknown>): boolean {
  const isHandout = data.is_handout === true || data.is_handout === 'true'
  return isHandout && !hasWidgetOfficesCityFilter(data)
}

function parseWidgetOfficesBootstrapScope(data: Record<string, unknown>): CdekOfficesScope | null {
  const raw = data.widget_offices_scope
  if (raw === 'region' || raw === 'country') return raw
  return null
}

export function isWidgetRegionBootstrapRequest(data: Record<string, unknown>): boolean {
  if (parseWidgetOfficesBootstrapScope(data) !== 'region') return false
  const regionCode = parseOptionalInt(data.region_code ?? data.regionCode)
  return regionCode != null && regionCode > 0
}

export function resolveOfficesScope(data: Record<string, unknown>): CdekOfficesScope {
  const bootstrapScope = parseWidgetOfficesBootstrapScope(data)
  if (bootstrapScope === 'region' && isWidgetRegionBootstrapRequest(data)) return 'region'
  if (data.offices_scope === 'country' || bootstrapScope === 'country') return 'country'
  if (isWidgetCountryHandoutRequest(data)) return 'country'
  return 'local'
}

export function normalizeWidgetOfficesQuery(
  data: Record<string, unknown>,
  options?: { defaultCityCode?: number | null; officesScope?: CdekOfficesScope }
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...data }
  delete normalized.offices_scope
  delete normalized.widget_offices_scope

  const officesScope = options?.officesScope ?? resolveOfficesScope(data)

  if (normalized.country_code == null) normalized.country_code = 'RU'
  if (normalized.type == null) normalized.type = 'PVZ'

  const regionCode = parseOptionalInt(normalized.region_code ?? normalized.regionCode)
  if (regionCode != null && regionCode > 0) {
    normalized.region_code = regionCode
    delete normalized.regionCode
  }

  const cityCode = parseOptionalInt(normalized.city_code ?? normalized.cityCode)
  if (cityCode != null && cityCode > 0) {
    normalized.city_code = cityCode
    delete normalized.cityCode
  }

  if (
    officesScope === 'local' &&
    !hasWidgetOfficesCityFilter(normalized)
  ) {
    const fallbackCityCode =
      options?.defaultCityCode != null && options.defaultCityCode > 0
        ? options.defaultCityCode
        : DEFAULT_OFFICES_CITY_CODE
    normalized.city_code = fallbackCityCode
    normalized._injected_city_code = true
  }

  if (isWidgetOfficesBulkDumpRequest(normalized)) {
    normalized.page = 0
    normalized.size = OFFICES_PAGE_SIZE
    normalized._converted_bulk_dump = true
  }

  return normalized
}

export function countOfficesPayload(text: string): number {
  try {
    const parsed = JSON.parse(text) as unknown
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

export function sliceOfficesPayload(text: string, start: number, count: number): string {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!Array.isArray(parsed)) return '[]'
    return JSON.stringify(parsed.slice(start, start + count))
  } catch {
    return '[]'
  }
}

export function buildOfficesCacheKey(data: Record<string, unknown>): string {
  const entries = Object.entries(data)
    .filter(([key, value]) => !key.startsWith('_') && value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right))
  return JSON.stringify(entries)
}

export function buildProbeOfficesResponse(
  fullResult: {
    status: number
    text: string
    responseHeaders: Headers
  },
  totalElements?: number | null
): {
  status: number
  text: string
  responseHeaders: Record<string, string>
} {
  const resolvedTotal = totalElements ?? countOfficesPayload(fullResult.text)
  const probeBody = sliceOfficesPayload(fullResult.text, 0, 1)

  return {
    status: fullResult.status,
    text: probeBody,
    responseHeaders: mergeOfficesProxyHeaders({
      upstreamHeaders: fullResult.responseHeaders,
      totalElements: resolvedTotal,
    }),
  }
}

export async function countOfficesTotalByPaging(
  fetchPage: (page: number) => Promise<{ text: string }>,
  maxPages: number = OFFICES_MAX_PAGES
): Promise<number> {
  let total = 0

  for (let page = 0; page <= maxPages; page += 1) {
    const result = await fetchPage(page)
    const count = countOfficesPayload(result.text)
    total += count
    if (count < OFFICES_PAGE_SIZE) return total
  }

  return total
}

export function readUpstreamOfficesTotal(headers: Headers): number | null {
  const raw =
    headers.get('x-total-elements') ?? headers.get('X-Total-Elements')
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function mergeOfficesProxyHeaders(params: {
  upstreamHeaders: Headers
  totalElements?: number | null
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Service-Version': '3.11.1',
    'Cache-Control': 'no-store',
  }

  const upstreamTotal =
    params.upstreamHeaders.get('x-total-elements') ??
    params.upstreamHeaders.get('X-Total-Elements')
  if (upstreamTotal) {
    headers['x-total-elements'] = upstreamTotal
    return headers
  }

  if (params.totalElements != null && params.totalElements >= 0) {
    headers['x-total-elements'] = String(params.totalElements)
  }

  return headers
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
