import { describe, expect, it, vi } from 'vitest'
import {
  COUNTRY_OFFICES_EXPAND_APPLY_EVERY_PAGES,
  expandCountryOfficesIntoWidget,
  fetchCountryOfficesForWidget,
  fetchCountryOfficesStaged,
} from '@/lib/cdek-widget-country-offices'

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
})
