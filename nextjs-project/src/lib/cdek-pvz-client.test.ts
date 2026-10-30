import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CdekPvzManifest } from './cdek-pvz-types'

const config = vi.hoisted(() => ({ cdn: 'https://cdn.example.test' }))
vi.mock('@/lib/cdn', () => ({ get CDN_URL() { return config.cdn } }))

import { fetchCdekPvzManifest, fetchCdekPvzRegion } from './cdek-pvz-client'
import { expandCountryOfficesIntoWidget, fetchCountryOfficesStaged } from './cdek-widget-country-offices'
import { readCountryOfficesCache, writeCountryOfficesCache } from './cdek-widget-offices-client-cache'

const regionPath = (code: number, version = 'a') => `/api/cdek-pvz/regions/${version.repeat(64)}/${code}.json`
function manifest(publishedAt = '2026-10-27T00:00:00Z'): CdekPvzManifest {
  return { schemaVersion: 1, publishedAt, regions: {
    '81': { path: regionPath(81), totalCount: 1, updatedAt: publishedAt, isStale: false },
    '82': { path: regionPath(82), totalCount: 1, updatedAt: publishedAt, isStale: false },
  } }
}
const json = (value: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(value), { status, headers })
const fetchMock = vi.fn()

beforeEach(() => {
  config.cdn = 'https://cdn.example.test'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('versioned PVZ client', () => {
  it('reads the manifest from origin with no-store on every load', async () => {
    fetchMock.mockImplementation(async () => json(manifest()))
    expect(await fetchCdekPvzManifest()).toEqual(manifest())
    await fetchCdekPvzManifest()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenLastCalledWith('/api/cdek-pvz/manifest', expect.objectContaining({
      cache: 'no-store', credentials: 'omit',
    }))
  })

  it('keeps the legacy path when CDN is disabled', async () => {
    config.cdn = ''
    expect(await fetchCdekPvzManifest()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads immutable regional URLs through CDN without cookies', async () => {
    fetchMock.mockResolvedValue(json([{ code: 'A' }]))
    expect(await fetchCdekPvzRegion(manifest(), 81)).toEqual([{ code: 'A' }])
    expect(fetchMock).toHaveBeenCalledWith(`https://cdn.example.test${regionPath(81)}`,
      expect.objectContaining({ credentials: 'omit' }))
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('cache')
  })

  it('rejects mismatched or non-snapshot manifest paths', async () => {
    const bad = manifest()
    bad.regions['81'].path = 'https://other.test/data.json'
    fetchMock.mockResolvedValue(json(bad))
    expect(await fetchCdekPvzManifest()).toBeNull()
  })

  it('does not accept truncated snapshot arrays', async () => {
    fetchMock.mockResolvedValue(json([]))
    await expect(fetchCdekPvzRegion(manifest(), 81)).rejects.toThrow('Incomplete')
  })

  it('bounds manifest latency so an unavailable origin can fall back', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const pending = fetchCdekPvzManifest()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(await pending).toBeNull()
  })
})

describe('regional CDN country expansion', () => {
  it('loads the current region first so staged updates retain its markers', async () => {
    fetchMock.mockResolvedValueOnce(json(manifest()))
      .mockResolvedValueOnce(json([{ code: 'CURRENT' }]))
      .mockResolvedValueOnce(json([{ code: 'OTHER' }]))
    await fetchCountryOfficesStaged({ priorityRegionCode: 82, batchPauseMs: 0 })
    expect(fetchMock.mock.calls[1][0]).toBe(`https://cdn.example.test${regionPath(82)}`)
  })

  it('loads regions in stages without calling the country API', async () => {
    fetchMock.mockResolvedValueOnce(json(manifest()))
      .mockResolvedValueOnce(json([{ code: 'A' }]))
      .mockResolvedValueOnce(json([{ code: 'B' }]))
    const batches: unknown[][] = []
    const result = await fetchCountryOfficesStaged({ batchPauseMs: 0, onBatch: ({ accumulated }) => {
      batches.push([...accumulated])
    } })
    expect(result).toEqual([{ code: 'A' }, { code: 'B' }])
    expect(batches).toEqual([[{ code: 'A' }], [{ code: 'A' }, { code: 'B' }]])
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('/service'))).toBe(true)
  })

  it('replaces a partial CDN load with the current API after a failed region', async () => {
    fetchMock.mockResolvedValueOnce(json(manifest()))
      .mockResolvedValueOnce(json([{ code: 'A' }]))
      .mockResolvedValueOnce(json({ error: 'unavailable' }, 503))
      .mockResolvedValueOnce(json([], 200, { 'x-total-elements': '1' }))
      .mockResolvedValueOnce(json([{ code: 'API' }]))
    const batches: unknown[][] = []
    expect(await fetchCountryOfficesStaged({ brandId: 'inner', batchPauseMs: 0,
      onBatch: ({ accumulated }) => { batches.push([...accumulated]) },
    })).toEqual([{ code: 'API' }])
    expect(batches).toEqual([[{ code: 'A' }], [{ code: 'API' }]])
    expect(fetchMock.mock.calls[3][0]).toBe('/api/cdek-widget/service?brand=inner')
    expect(fetchMock.mock.calls[3][1].method).toBe('POST')
  })

  it('uses the current API when no publication exists yet', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json([], 200, { 'x-total-elements': '1' }))
      .mockResolvedValueOnce(json([{ code: 'API' }]))
    expect(await fetchCountryOfficesStaged({ batchPauseMs: 0 })).toEqual([{ code: 'API' }])
  })

  it('invalidates a fresh session cache as soon as the origin manifest changes', async () => {
    const values = new Map<string, string>()
    vi.stubGlobal('window', { sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } })
    writeCountryOfficesCache([{ code: 'OLD' }], '2026-10-26T00:00:00Z')
    fetchMock.mockResolvedValueOnce(json(manifest()))
      .mockResolvedValueOnce(json([{ code: 'NEW-A' }]))
      .mockResolvedValueOnce(json([{ code: 'NEW-B' }]))
    const applyOffices = vi.fn().mockResolvedValue(undefined)
    expect(await expandCountryOfficesIntoWidget({ batchPauseMs: 0, applyOffices })).toBe(2)
    expect(applyOffices).toHaveBeenLastCalledWith([{ code: 'NEW-A' }, { code: 'NEW-B' }])
    expect(readCountryOfficesCache(manifest().publishedAt)).toEqual([{ code: 'NEW-A' }, { code: 'NEW-B' }])
    fetchMock.mockResolvedValueOnce(json(manifest()))
    await expandCountryOfficesIntoWidget({ batchPauseMs: 0, applyOffices })
    expect(fetchMock).toHaveBeenCalledTimes(4) // fresh pointer; immutable data reused
  })

  it('does not turn cancellation into an API fallback', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(fetchCountryOfficesStaged({ signal: controller.signal, manifest: manifest() }))
      .rejects.toThrow('aborted')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
