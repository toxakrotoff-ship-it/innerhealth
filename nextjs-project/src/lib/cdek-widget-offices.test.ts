import { describe, expect, it } from 'vitest'
import {
  countOfficesPayload,
  isWidgetOfficesBulkDumpRequest,
  isWidgetOfficesProbeRequest,
  mergeOfficesProxyHeaders,
  normalizeWidgetOfficesQuery,
} from '@/lib/cdek-widget-offices'

describe('cdek-widget-offices', () => {
  it('detects probe and bulk dump requests', () => {
    expect(isWidgetOfficesProbeRequest({ page: 1, size: 1 })).toBe(true)
    expect(isWidgetOfficesProbeRequest({ page: 0, size: null })).toBe(false)
    expect(isWidgetOfficesBulkDumpRequest({ page: 0, size: null })).toBe(true)
    expect(isWidgetOfficesBulkDumpRequest({ page: 0, size: 500 })).toBe(false)
  })

  it('injects city_code and converts bulk dump to paginated request', () => {
    const normalized = normalizeWidgetOfficesQuery(
      { action: 'offices', page: 0, is_handout: true },
      137
    )

    expect(normalized.city_code).toBe(137)
    expect(normalized.country_code).toBe('RU')
    expect(normalized.type).toBe('PVZ')
    expect(normalized.size).toBe(500)
    expect(normalized._converted_bulk_dump).toBe(true)
  })

  it('keeps explicit city filter and synthesizes x-total-elements', () => {
    const normalized = normalizeWidgetOfficesQuery(
      { action: 'offices', city_code: 44, page: 1, size: 1 },
      137
    )

    expect(normalized.city_code).toBe(44)
    expect(normalized._injected_city_code).toBeUndefined()

    const headers = mergeOfficesProxyHeaders({
      upstreamHeaders: new Headers(),
      totalElements: 42,
    })
    expect(headers['x-total-elements']).toBe('42')
  })

  it('counts offices payload length', () => {
    expect(countOfficesPayload('[{"code":"A"},{"code":"B"}]')).toBe(2)
    expect(countOfficesPayload('not-json')).toBe(0)
  })
})
