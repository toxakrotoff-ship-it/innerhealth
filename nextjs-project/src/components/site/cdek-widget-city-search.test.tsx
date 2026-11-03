import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CdekWidget } from './cdek-widget'
import { resolveWidgetGeoRegion } from '@/lib/cdek-widget-geo-region'
import { fetchWidgetRegionOffices } from '@/lib/cdek-widget-region-offices'
import { expandCountryOfficesIntoWidget } from '@/lib/cdek-widget-country-offices'

vi.mock('@/lib/cart-debug-log', () => ({ logCartDebug: vi.fn() }))
vi.mock('@/lib/cdek-pvz-client', () => ({ fetchCdekPvzManifest: async () => null, fetchCdekPvzRegion: vi.fn() }))
vi.mock('@/lib/cdek-widget-region-offices', () => ({ fetchWidgetRegionOffices: vi.fn() }))
vi.mock('@/lib/cdek-widget-country-offices', () => ({ expandCountryOfficesIntoWidget: vi.fn() }))
vi.mock('@/lib/cdek-widget-preload', () => ({
  getCachedCdekWidgetConfig: async () => ({ from: { code: 44 }, yandexMapsApiKey: 'test-key', goods: [] }),
  loadCdekWidgetScriptOnce: async () => {}, preloadCdekYandexMapsV3: async () => {},
}))
vi.mock('@/lib/cdek-widget-geo-region', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/cdek-widget-geo-region')>(),
  isCdekWidgetMobileClient: () => true,
  resolveWidgetGeoRegion: vi.fn(),
  resolveWidgetOfficesBootstrap: async () => ({
    geoRegion: { regionCode: 81, cityCode: 44, city: 'Москва', defaultLocation: 'Москва' },
    bootstrap: { bootstrapSource: 'geo_region', geoDenied: false, fallbackCityCode: null }, coords: null,
  }),
}))

type WidgetOptions = { onReady: () => void; onSearchLocation: (position: number[]) => void }
let options: WidgetOptions
const updateOfficesRaw = vi.fn().mockResolvedValue(undefined)
const constructed = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  window.CDEKWidget = class {
    updateOfficesRaw = updateOfficesRaw
    constructor(params: Record<string, unknown>) { options = params as WidgetOptions; constructed(params) }
  }
  vi.mocked(resolveWidgetGeoRegion).mockResolvedValue({
    regionCode: 7, cityCode: null, city: 'Сочи', region: 'Краснодарский край', defaultLocation: 'Сочи',
  })
  vi.mocked(fetchWidgetRegionOffices).mockResolvedValue([{ code: 'SOCHI1' }])
})
afterEach(() => { cleanup(); delete window.CDEKWidget })

async function renderWidget(brandId: 'inner' | 'sprint-power' = 'inner') {
  const result = render(<CdekWidget brandId={brandId} items={[{ productId: 'p1', quantity: 1 }]}
    onChoose={() => {}} onCalculate={() => {}} />)
  await waitFor(() => expect(constructed).toHaveBeenCalledOnce())
  await act(async () => options.onReady())
  return result
}

describe('CDEK city search on mobile', () => {
  it.each(['inner', 'sprint-power'] as const)('replaces Moscow offices with the searched Sochi region for %s', async (brandId) => {
    await renderWidget(brandId)
    await act(async () => options.onSearchLocation([39.7231, 43.5855]))
    await waitFor(() => expect(updateOfficesRaw).toHaveBeenCalledWith([{ code: 'SOCHI1' }]))
    expect(resolveWidgetGeoRegion).toHaveBeenCalledWith(expect.objectContaining({
      brandId, coords: { longitude: 39.7231, latitude: 43.5855 },
    }))
    expect(fetchWidgetRegionOffices).toHaveBeenCalledWith(expect.objectContaining({ brandId, regionCode: 7 }))
    expect(expandCountryOfficesIntoWidget).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('ignores a late region response after another city was selected', async () => {
    let finishFirst!: (offices: unknown[]) => void
    vi.mocked(fetchWidgetRegionOffices).mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve }))
    await renderWidget()
    await act(async () => options.onSearchLocation([39.7231, 43.5855]))
    await waitFor(() => expect(fetchWidgetRegionOffices).toHaveBeenCalledOnce())
    const firstSignal = vi.mocked(fetchWidgetRegionOffices).mock.calls[0][0].signal
    await act(async () => options.onSearchLocation([30.3, 59.9]))
    await waitFor(() => expect(updateOfficesRaw).toHaveBeenCalledOnce())
    await act(async () => finishFirst([{ code: 'OLD_CITY' }]))
    expect(firstSignal.aborted).toBe(true)
    expect(updateOfficesRaw).toHaveBeenCalledTimes(1)
  })

  it('shows a recoverable loading error and allows the next search to succeed', async () => {
    vi.mocked(fetchWidgetRegionOffices).mockRejectedValueOnce(new Error('503'))
    await renderWidget()
    await act(async () => options.onSearchLocation([39.7231, 43.5855]))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить пункты')
    await act(async () => options.onSearchLocation([39.7231, 43.5855]))
    await waitFor(() => expect(updateOfficesRaw).toHaveBeenCalledOnce())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reloads even the initial region when bootstrap did not supply offices', async () => {
    vi.mocked(resolveWidgetGeoRegion).mockResolvedValueOnce({
      regionCode: 81, cityCode: 44, city: 'Москва', region: 'Москва', defaultLocation: 'Москва',
    })
    await renderWidget()
    await act(async () => options.onSearchLocation([37.6173, 55.7558]))
    await waitFor(() => expect(fetchWidgetRegionOffices).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 81 })))
    expect(updateOfficesRaw).toHaveBeenCalledOnce()
  })

  it('aborts a pending region load when the widget unmounts', async () => {
    vi.mocked(fetchWidgetRegionOffices).mockImplementationOnce(() => new Promise(() => {}))
    const { unmount } = await renderWidget()
    await act(async () => options.onSearchLocation([39.7231, 43.5855]))
    const signal = vi.mocked(fetchWidgetRegionOffices).mock.calls[0][0].signal
    unmount()
    expect(signal.aborted).toBe(true)
    expect(updateOfficesRaw).not.toHaveBeenCalled()
  })
})
