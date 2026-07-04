import { describe, expect, it } from 'vitest'
import {
  buildProbeOfficesResponse,
  countOfficesPayload,
  countOfficesTotalByPaging,
  isWidgetOfficesBulkDumpRequest,
  isWidgetOfficesProbeRequest,
  isWidgetCountryHandoutRequest,
  isWidgetRegionBootstrapRequest,
  mergeOfficesProxyHeaders,
  normalizeWidgetOfficesQuery,
  readUpstreamOfficesTotal,
  resolveOfficesScope,
} from '@/lib/cdek-widget-offices'

describe('cdek-widget-offices', () => {
  it('detects probe and bulk dump requests', () => {
    expect(isWidgetOfficesProbeRequest({ page: 1, size: 1 })).toBe(true)
    expect(isWidgetOfficesProbeRequest({ page: 0, size: null })).toBe(false)
    expect(isWidgetOfficesBulkDumpRequest({ page: 0, size: null })).toBe(true)
    expect(isWidgetOfficesBulkDumpRequest({ page: 0, size: 500 })).toBe(false)
  })

  it('resolves region bootstrap scope from widget query params', () => {
    expect(
      resolveOfficesScope({
        widget_offices_scope: 'region',
        region_code: 39,
        is_handout: true,
      })
    ).toBe('region')
    expect(isWidgetRegionBootstrapRequest({ widget_offices_scope: 'region', region_code: 39 })).toBe(
      true
    )
  })

  it('falls back to country when region bootstrap has no region_code', () => {
    expect(
      resolveOfficesScope({
        widget_offices_scope: 'region',
        is_handout: true,
      })
    ).toBe('country')
  })

  it('does not inject city_code for region bootstrap handout', () => {
    const normalized = normalizeWidgetOfficesQuery({
      action: 'offices',
      widget_offices_scope: 'region',
      region_code: 39,
      is_handout: true,
      page: 0,
      size: null,
    })

    expect(normalized.region_code).toBe(39)
    expect(normalized.city_code).toBeUndefined()
    expect(normalized._injected_city_code).toBeUndefined()
  })

  it('normalizes region_code and city_code from query strings', () => {
    const normalized = normalizeWidgetOfficesQuery({
      action: 'offices',
      widget_offices_scope: 'region',
      region_code: '39',
      city_code: '137',
      is_handout: true,
      page: 0,
      size: null,
    })

    expect(normalized.region_code).toBe(39)
    expect(normalized.city_code).toBe(137)
  })

  it('resolves offices scope from request payload', () => {
    expect(resolveOfficesScope({ offices_scope: 'country' })).toBe('country')
    expect(resolveOfficesScope({ is_handout: true })).toBe('country')
    expect(resolveOfficesScope({ is_reception: true })).toBe('local')
  })

  it('detects widget handout requests that should load country-wide offices', () => {
    expect(isWidgetCountryHandoutRequest({ is_handout: true })).toBe(true)
    expect(isWidgetCountryHandoutRequest({ is_handout: true, city_code: 44 })).toBe(false)
  })

  it('does not inject city_code for widget handout bulk dump', () => {
    const normalized = normalizeWidgetOfficesQuery(
      { action: 'offices', page: 0, is_handout: true },
      { defaultCityCode: 137 }
    )

    expect(normalized.city_code).toBeUndefined()
    expect(normalized._injected_city_code).toBeUndefined()
    expect(normalized.country_code).toBe('RU')
    expect(normalized.type).toBe('PVZ')
    expect(normalized.size).toBe(500)
    expect(normalized._converted_bulk_dump).toBe(true)
  })

  it('injects city_code for non-handout local scope', () => {
    const normalized = normalizeWidgetOfficesQuery(
      { action: 'offices', page: 0, is_reception: true },
      { defaultCityCode: 137, officesScope: 'local' }
    )

    expect(normalized.city_code).toBe(137)
    expect(normalized._injected_city_code).toBe(true)
  })

  it('does not inject city_code for country scope', () => {
    const normalized = normalizeWidgetOfficesQuery(
      { action: 'offices', offices_scope: 'country', page: 1, size: 1 },
      { defaultCityCode: 44, officesScope: 'country' }
    )

    expect(normalized.city_code).toBeUndefined()
    expect(normalized._injected_city_code).toBeUndefined()
  })

  it('keeps explicit city filter and synthesizes x-total-elements', () => {
    const normalized = normalizeWidgetOfficesQuery(
      { action: 'offices', city_code: 44, page: 1, size: 1 },
      { officesScope: 'local' }
    )

    expect(normalized.city_code).toBe(44)
    expect(normalized._injected_city_code).toBeUndefined()

    const headers = mergeOfficesProxyHeaders({
      upstreamHeaders: new Headers(),
      totalElements: 42,
    })
    expect(headers['x-total-elements']).toBe('42')
  })

  it('builds probe response from a full offices page', () => {
    const probe = buildProbeOfficesResponse({
      status: 200,
      text: JSON.stringify([{ code: 'A' }, { code: 'B' }]),
      responseHeaders: new Headers(),
    })

    expect(probe.status).toBe(200)
    expect(JSON.parse(probe.text)).toEqual([{ code: 'A' }])
    expect(probe.responseHeaders['x-total-elements']).toBe('2')
  })

  it('counts offices payload length', () => {
    expect(countOfficesPayload('[{"code":"A"},{"code":"B"}]')).toBe(2)
    expect(countOfficesPayload('not-json')).toBe(0)
  })

  it('counts total offices across pages', async () => {
    const pages = [
      JSON.stringify(Array.from({ length: 500 }, (_, index) => ({ code: `A${index}` }))),
      JSON.stringify([{ code: 'B1' }, { code: 'B2' }]),
    ]

    const total = await countOfficesTotalByPaging(async (page) => ({
      text: pages[page] ?? '[]',
    }))

    expect(total).toBe(502)
  })

  it('reads upstream total header', () => {
    const headers = new Headers({ 'x-total-elements': '1234' })
    expect(readUpstreamOfficesTotal(headers)).toBe(1234)
    expect(readUpstreamOfficesTotal(new Headers())).toBeNull()
  })
})
