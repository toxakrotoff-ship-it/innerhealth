import { describe, expect, it, vi } from 'vitest'
import {
  fetchCountryOfficesRaw,
  fetchCountryOfficesStaged,
  mapWithConcurrency,
} from '@/lib/cdek-widget-country-offices'

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

  it('limits concurrent page fetches in staged mode', async () => {
    let inFlight = 0
    let maxInFlight = 0

    const fetchMock = vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
      const body = String(init?.body ?? '')
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1

      if (body.includes('"page":1') && body.includes('"size":1')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'x-total-elements': '1500' }),
          json: async () => [{ code: 'PROBE' }],
        }
      }

      const pageMatch = body.match(/"page":(\d+)/)
      const page = pageMatch ? Number(pageMatch[1]) : 0

      return {
        ok: true,
        status: 200,
        json: async () => [{ code: `P${page}` }],
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    const offices = await fetchCountryOfficesStaged({
      brandId: 'inner',
      concurrency: 2,
    })

    expect(offices).toHaveLength(3)
    expect(maxInFlight).toBeLessThanOrEqual(2)
  })

  it('runs mapWithConcurrency with a hard cap', async () => {
    let inFlight = 0
    let maxInFlight = 0

    const results = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (value) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, 5))
        inFlight -= 1
        return value * 2
      }
    )

    expect(results).toEqual([2, 4, 6, 8, 10])
    expect(maxInFlight).toBeLessThanOrEqual(2)
  })
})
