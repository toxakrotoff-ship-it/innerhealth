import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { CdekWidget } from './cdek-widget'

vi.mock('@/lib/cdn', () => ({ CDN_URL: 'https://cdn.example.test' }))
vi.mock('@/lib/cart-debug-log', () => ({ logCartDebug: vi.fn() }))
vi.mock('@/lib/cdek-widget-preload', () => ({
  getCachedCdekWidgetConfig: async () => ({
    from: { code: 44 }, yandexMapsApiKey: 'test-key', goods: [], tariffs: { office: [], door: [] },
  }),
  loadCdekWidgetScriptOnce: async () => {},
  preloadCdekYandexMapsV3: async () => {},
}))
vi.mock('@/lib/cdek-widget-geo-region', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/cdek-widget-geo-region')>(),
  resolveWidgetOfficesBootstrap: async () => ({
    geoRegion: { regionCode: 81, cityCode: 44, city: 'Москва', region: 'Москва', defaultLocation: 'Москва' },
    bootstrap: { bootstrapSource: 'geo_region', geoDenied: false, fallbackCityCode: null },
    coords: null,
  }),
}))

afterEach(() => {
  cleanup()
  delete window.CDEKWidget
  vi.unstubAllGlobals()
})

describe('CDEK widget CDN bootstrap', () => {
  it.each([true, false])('initializes the map with CDN success=%s and retains the API for tariffs/fallback', async (success) => {
    const snapshotPath = `/api/cdek-pvz/regions/${'a'.repeat(64)}/81.json`
    const offices = [{ code: 'MSK1', location: { city_code: 44 } }]
    const manifest = { schemaVersion: 1, publishedAt: '2026-10-27T00:00:00Z', regions: {
      '81': { path: snapshotPath, totalCount: 1, updatedAt: '2026-10-27T00:00:00Z', isStale: false },
    } }
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(manifest)))
      .mockResolvedValueOnce(new Response(JSON.stringify(success ? offices : {}), { status: success ? 200 : 503 })))
    const constructed = vi.fn()
    window.CDEKWidget = class {
      updateOfficesRaw = vi.fn().mockResolvedValue(undefined)
      constructor(params: Record<string, unknown>) { constructed(params) }
    }

    render(<CdekWidget items={[{ productId: 'p1', quantity: 1 }]}
      onChoose={() => {}} onCalculate={() => {}} />)

    await waitFor(() => expect(constructed).toHaveBeenCalledOnce())
    const params = constructed.mock.calls[0][0]
    expect(params.servicePath).toContain('/api/cdek-widget/service')
    if (success) expect(params.officesRaw).toEqual(offices)
    else expect(params).not.toHaveProperty('officesRaw')
  })
})
