import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWidgetRegionOffices } from './cdek-widget-region-offices'

vi.mock('@/lib/cdn', () => ({ CDN_URL: 'https://cdn.example.test' }))

const path = `/api/cdek-pvz/regions/${'a'.repeat(64)}/7.json`
const manifest = { schemaVersion: 1, publishedAt: '2026-11-03T00:00:00Z', regions: {
  '7': { path, totalCount: 1 },
} }

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('searched CDEK region offices', () => {
  it('loads just the requested region from the published snapshot', async () => {
    const offices = [{ code: 'SOCHI1' }]
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockResolvedValueOnce(Response.json(offices))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchWidgetRegionOffices({ regionCode: 7, signal: new AbortController().signal })).toEqual(offices)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe(`https://cdn.example.test${path}`)
  })

  it.each(['inner', 'sprint-power'] as const)('falls back to paginated regional API for %s when CDN fails', async (brandId) => {
    const firstPage = Array.from({ length: 500 }, (_, i) => ({ code: `SOCHI${i}` }))
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(manifest))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json(firstPage))
      .mockResolvedValueOnce(Response.json([{ code: 'SOCHI500' }]))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchWidgetRegionOffices({ brandId, regionCode: 7, signal: new AbortController().signal })).toHaveLength(501)
    for (let page = 0; page < 2; page += 1) {
      const [url, init] = fetchMock.mock.calls[page + 2]
      expect(url).toBe(`/api/cdek-widget/service?brand=${brandId}`)
      expect(JSON.parse(init.body)).toEqual({
        action: 'offices', widget_offices_scope: 'region', region_code: 7,
        is_handout: true, page, size: 500,
      })
    }
  })

  it('reports a failed API request instead of presenting it as an empty city', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 502 })))
    await expect(fetchWidgetRegionOffices({ regionCode: 7, signal: new AbortController().signal })).rejects.toThrow('502')
  })

  it('does not fall back to API after a city selection was cancelled', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockImplementation(async () => {
      controller.abort()
      return Response.json(manifest)
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchWidgetRegionOffices({ regionCode: 7, signal: controller.signal })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('loads through the API without AbortSignal.any and forwards cancellation', async () => {
    vi.spyOn(AbortSignal, 'any').mockImplementation(() => { throw new Error('Unsupported browser API') })
    const controller = new AbortController()
    let apiSignal: AbortSignal | undefined
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockImplementationOnce(async (_url, init) => {
        apiSignal = init.signal
        controller.abort()
        apiSignal!.throwIfAborted()
      })
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchWidgetRegionOffices({ regionCode: 7, signal: controller.signal })).rejects.toThrow()
    expect(apiSignal?.aborted).toBe(true)
    expect(AbortSignal.any).not.toHaveBeenCalled()
  })

  it('times out stalled API loads', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')))
      }))
    vi.stubGlobal('fetch', fetchMock)
    const result = expect(fetchWidgetRegionOffices({ regionCode: 7, signal: new AbortController().signal })).rejects.toThrow('Timeout')
    await vi.advanceTimersByTimeAsync(25_000)
    await result
    expect(vi.getTimerCount()).toBe(0)
  })
})
