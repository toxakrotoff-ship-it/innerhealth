import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COUNTRY_OFFICES_EXPAND_APPLY_EVERY_PAGES,
  expandCountryOfficesIntoWidget,
  fetchCountryOfficesForWidget,
  fetchCountryOfficesStaged,
} from '@/lib/cdek-widget-country-offices'

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

function mockCountryOfficesFetch(pages: unknown[][], totalElements?: number) {
  const resolvedTotal = totalElements ?? pages.reduce((sum, page) => sum + page.length, 0)
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'x-total-elements': String(resolvedTotal) }),
      json: async () => [{ code: 'PROBE' }],
    })

  for (const page of pages) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => page,
    })
  }

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('cdek-widget-country-offices', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches all country office pages sequentially after probe', async () => {
    const fetchMock = mockCountryOfficesFetch([[{ code: 'A1' }, { code: 'A2' }, { code: 'A3' }]])

    const offices = await fetchCountryOfficesForWidget({ brandId: 'inner' })

    expect(offices).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('"offices_scope":"country"')
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).toContain('"page":0')
  })

  it('fetches and applies country offices sequentially page by page', async () => {
    mockCountryOfficesFetch(
      [
        [{ code: 'P0A' }, { code: 'P0B' }],
        [{ code: 'P1A' }, { code: 'P1B' }],
      ],
      1000
    )

    const appliedLengths: number[] = []

    const offices = await fetchCountryOfficesStaged({
      brandId: 'inner',
      applyEveryPages: 1,
      batchPauseMs: 0,
      onBatch: async ({ accumulated, meta }) => {
        appliedLengths.push(accumulated.length)
        expect(meta.shouldApply).toBe(true)
        expect(meta.totalLoaded).toBe(accumulated.length)
      },
    })

    expect(offices).toHaveLength(4)
    expect(appliedLengths).toEqual([2, 4])
  })

  it('applies widget updates every N pages during background expand', async () => {
    mockCountryOfficesFetch(
      [[{ code: 'P0A' }], [{ code: 'P1A' }], [{ code: 'P2A' }], [{ code: 'P3A' }]],
      2000
    )

    const appliedLengths: number[] = []

    await fetchCountryOfficesStaged({
      brandId: 'inner',
      applyEveryPages: 2,
      batchPauseMs: 0,
      onBatch: async ({ accumulated }) => {
        appliedLengths.push(accumulated.length)
      },
    })

    expect(appliedLengths).toEqual([2, 4])
    expect(COUNTRY_OFFICES_EXPAND_APPLY_EVERY_PAGES).toBe(3)
  })

  it('expands country offices into widget with batched apply callbacks', async () => {
    mockCountryOfficesFetch([[{ code: 'A1' }, { code: 'A2' }]])

    const applied: unknown[][] = []
    const total = await expandCountryOfficesIntoWidget({
      brandId: 'inner',
      applyOffices: async (offices) => {
        applied.push([...offices])
      },
    })

    expect(total).toBe(2)
    expect(applied).toHaveLength(1)
    expect(applied[0]).toHaveLength(2)
  })

  it('passes custom applyEveryPages/batchPauseMs through to the staged fetch', async () => {
    const fetchMock = mockCountryOfficesFetch(
      [[{ code: 'P0A' }], [{ code: 'P1A' }], [{ code: 'P2A' }]],
      1001
    )

    const applied: unknown[][] = []
    await expandCountryOfficesIntoWidget({
      brandId: 'inner',
      applyEveryPages: 1,
      batchPauseMs: 0,
      applyOffices: async (offices) => {
        applied.push([...offices])
      },
    })

    // probe + 3 pages, applied after every page since applyEveryPages=1
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(applied).toHaveLength(3)
  })

  it('serves from sessionStorage cache without any network calls on a cache hit', async () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'cdek-country-offices-cache-v1',
      JSON.stringify({
        version: 1,
        storedAt: Date.now(),
        offices: [{ code: 'CACHED_A' }, { code: 'CACHED_B' }],
      })
    )
    vi.stubGlobal('window', { sessionStorage: storage })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const applied: unknown[][] = []
    const total = await expandCountryOfficesIntoWidget({
      brandId: 'inner',
      applyOffices: async (offices) => {
        applied.push([...offices])
      },
    })

    expect(total).toBe(2)
    expect(applied).toEqual([[{ code: 'CACHED_A' }, { code: 'CACHED_B' }]])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('writes the fetched country offices to sessionStorage once complete', async () => {
    const storage = createMemoryStorage()
    vi.stubGlobal('window', { sessionStorage: storage })
    mockCountryOfficesFetch([[{ code: 'A1' }, { code: 'A2' }]])

    await expandCountryOfficesIntoWidget({
      brandId: 'inner',
      applyOffices: async () => {},
    })

    const cached = storage.getItem('cdek-country-offices-cache-v1')
    expect(cached).not.toBeNull()
    const parsed = JSON.parse(cached as string)
    expect(parsed.offices).toEqual([{ code: 'A1' }, { code: 'A2' }])
  })
})
