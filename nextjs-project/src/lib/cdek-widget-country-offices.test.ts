import { describe, expect, it, vi } from 'vitest'
import { fetchCountryOfficesRaw } from '@/lib/cdek-widget-country-offices'

describe('cdek-widget-country-offices', () => {
  it('fetches all country office pages after probe', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'x-total-elements': '3' }),
        json: async () => [{ code: 'PROBE' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ code: 'A1' }, { code: 'A2' }, { code: 'A3' }],
      })

    vi.stubGlobal('fetch', fetchMock)

    const offices = await fetchCountryOfficesRaw({ brandId: 'inner' })

    expect(offices).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('"offices_scope":"country"')
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).toContain('"page":0')
  })
})
