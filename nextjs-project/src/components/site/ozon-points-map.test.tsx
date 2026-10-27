/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { OzonPointsMap } from './ozon-points-map'

const first = { id: 1, name: 'Ozon', address: 'Москва, Тверская, 1', coordinates: { latitude: 55.75, longitude: 37.61 } }
const second = { ...first, id: 2, address: 'Казань', coordinates: { latitude: 55.79, longitude: 49.12 } }

function mockMaps(deferReady = false) {
  let finishReady = () => {}
  const map = { geoObjects: { add: vi.fn(), remove: vi.fn() }, setCenter: vi.fn(), setBounds: vi.fn(), destroy: vi.fn() }
  const clicks = new Set<(event: { get: (name: string) => unknown }) => void>()
  const clusterClicks = new Set<(event: { get: (name: string) => unknown }) => void>()
  const manager = {
    add: vi.fn(), removeAll: vi.fn(),
    objects: {
      events: {
        add: vi.fn((_event: string, handler: (event: { get: (name: string) => unknown }) => void) => clicks.add(handler)),
        remove: vi.fn((_event: string, handler: (event: { get: (name: string) => unknown }) => void) => clicks.delete(handler)),
      },
      setObjectOptions: vi.fn(),
    },
    clusters: {
      events: {
        add: vi.fn((_event: string, handler: (event: { get: (name: string) => unknown }) => void) => clusterClicks.add(handler)),
        remove: vi.fn((_event: string, handler: (event: { get: (name: string) => unknown }) => void) => clusterClicks.delete(handler)),
      },
      getById: vi.fn(),
    },
  }
  const Map = vi.fn(function () { return map })
  const ObjectManager = vi.fn(function () { return manager })
  const Placemark = vi.fn()
  vi.stubGlobal('ymaps', {
    ready: (callback: () => void) => { if (deferReady) finishReady = callback; else callback() }, Map, ObjectManager, Placemark,
  })
  return { map, Map, manager, ObjectManager, Placemark,
    click: (id: number | string) => act(() => clicks.forEach(handler => handler({ get: () => id }))),
    clusterClick: (id: number | string) => act(() => clusterClicks.forEach(handler => handler({ get: () => id }))),
    finishReady: () => finishReady() }
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Ozon pickup map', () => {
  it('selects markers, highlights a list selection and updates equal-length search results without recreating the map', () => {
    const maps = mockMaps()
    const onSelect = vi.fn()
    const { rerender, unmount } = render(<OzonPointsMap points={[first]} apiKey="public-key" onSelect={onSelect} />)
    expect(maps.manager.add.mock.calls[0][0].features[0]).toMatchObject({ id: 1, geometry: { type: 'Point', coordinates: [55.75, 37.61] } })
    maps.click(1)
    expect(onSelect).toHaveBeenCalledWith(first)
    rerender(<OzonPointsMap points={[second]} selectedId={2} apiKey="public-key" onSelect={onSelect} />)
    expect(maps.manager.add.mock.lastCall![0].features[0]).toMatchObject({ id: 2, geometry: { type: 'Point', coordinates: [55.79, 49.12] } })
    expect(maps.manager.objects.setObjectOptions).toHaveBeenLastCalledWith(2, { preset: 'islands#redIcon' })
    expect(maps.manager.removeAll).toHaveBeenCalledTimes(2)
    expect(maps.map.setCenter).toHaveBeenLastCalledWith([55.79, 49.12], 15)
    expect(maps.Map).toHaveBeenCalledTimes(1)
    unmount()
    expect(maps.map.destroy).toHaveBeenCalledTimes(1)
    expect(maps.manager.objects.events.remove).toHaveBeenCalledTimes(1)
    expect(maps.manager.clusters.events.remove).toHaveBeenCalledTimes(1)
  })

  it('fits all search results and escapes markup in marker hints', () => {
    const maps = mockMaps()
    render(<OzonPointsMap points={[{ ...first, name: '<img>' }, second]} apiKey="public-key" onSelect={vi.fn()} />)
    expect(maps.map.setBounds).toHaveBeenCalledWith([[55.75, 37.61], [55.79, 49.12]], { zoomMargin: 32 })
    expect(maps.manager.add.mock.calls[0][0].features[0]).toMatchObject({ geometry: { coordinates: [55.75, 37.61] }, properties: { hintContent: '&lt;img&gt;: Москва, Тверская, 1' } })
  })

  it('clusters a whole large city in one bulk add and updates only selected objects', () => {
    const maps = mockMaps()
    const points = Array.from({ length: 2000 }, (_, index) => ({
      ...first, id: index + 1, coordinates: { latitude: 55.7 + index / 100000, longitude: 37.6 + index / 100000 },
    }))
    const onSelect = vi.fn()
    const { rerender } = render(<OzonPointsMap points={points} apiKey="public-key" onSelect={onSelect} />)
    expect(maps.ObjectManager).toHaveBeenCalledWith(expect.objectContaining({ clusterize: true }))
    expect(maps.manager.add).toHaveBeenCalledTimes(1)
    expect(maps.manager.add.mock.calls[0][0]).toMatchObject({ type: 'FeatureCollection' })
    expect(maps.manager.add.mock.calls[0][0].features).toHaveLength(2000)
    expect(maps.Placemark).not.toHaveBeenCalled()
    maps.click('2000')
    expect(onSelect).toHaveBeenLastCalledWith(points[1999])
    rerender(<OzonPointsMap points={points} selectedId={2000} apiKey="public-key" onSelect={onSelect} />)
    expect(maps.manager.objects.setObjectOptions).toHaveBeenLastCalledWith(2000, { preset: 'islands#redIcon' })
    rerender(<OzonPointsMap points={points} selectedId={31} apiKey="public-key" onSelect={onSelect} />)
    expect(maps.manager.objects.setObjectOptions.mock.calls.slice(-2)).toEqual([
      [2000, { preset: 'islands#blueIcon' }], [31, { preset: 'islands#redIcon' }],
    ])
    expect(maps.manager.add).toHaveBeenCalledTimes(1)
    expect(maps.manager.removeAll).toHaveBeenCalledTimes(1)
    expect(maps.Map).toHaveBeenCalledTimes(1)
    expect(maps.map.geoObjects.add).toHaveBeenCalledTimes(1)
  })

  it('uses current point data and callbacks without selecting removed objects', () => {
    const maps = mockMaps()
    const initialSelect = vi.fn()
    const nextSelect = vi.fn()
    const { rerender } = render(<OzonPointsMap points={[first]} apiKey="public-key" onSelect={initialSelect} />)
    rerender(<OzonPointsMap points={[second]} apiKey="public-key" onSelect={nextSelect} />)
    maps.click(1)
    maps.click('invalid')
    expect(nextSelect).not.toHaveBeenCalled()
    maps.click(2)
    expect(initialSelect).not.toHaveBeenCalled()
    expect(nextSelect).toHaveBeenCalledExactlyOnceWith(second)
  })

  it('lets customers choose coincident cluster members beyond the first 30 without rebuilding city features', () => {
    // The shared style shim omits the method needed by accessible-name queries.
    const getComputedStyle = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      const style = getComputedStyle(element)
      return Object.assign(style, { getPropertyValue: (property: string) => String(style[property as keyof CSSStyleDeclaration] ?? '') })
    })
    const maps = mockMaps()
    const points = Array.from({ length: 40 }, (_, index) => ({ ...first, id: index + 1, address: `Москва, ПВЗ ${index + 1}` }))
    const onSelect = vi.fn()
    const { rerender, unmount } = render(<OzonPointsMap points={points} apiKey="public-key" onSelect={onSelect} />)
    const features = maps.manager.add.mock.calls[0][0].features
    maps.manager.clusters.getById.mockReturnValue({ properties: { geoObjects: [features[0], features[39]] } })
    maps.clusterClick('cluster-1')
    expect(maps.manager.clusters.getById).toHaveBeenCalledWith('cluster-1')
    const choices = screen.getByRole('region', { name: 'Пункты в выбранной группе' })
    expect(within(choices).getAllByRole('button')).toHaveLength(2)
    expect(within(choices).getByRole('list')).toHaveClass('max-h-64', 'overflow-y-auto')
    fireEvent.click(within(choices).getByRole('button', { name: 'Ozon: Москва, ПВЗ 40' }))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(points[39])
    expect(screen.queryByRole('region', { name: 'Пункты в выбранной группе' })).not.toBeInTheDocument()
    expect(maps.manager.add).toHaveBeenCalledTimes(1)
    expect(maps.manager.removeAll).toHaveBeenCalledTimes(1)

    maps.clusterClick('cluster-1')
    rerender(<OzonPointsMap points={points} selectedId={40} apiKey="public-key" onSelect={onSelect} />)
    expect(screen.queryByRole('region', { name: 'Пункты в выбранной группе' })).not.toBeInTheDocument()
    expect(maps.manager.add).toHaveBeenCalledTimes(1)
    maps.clusterClick('cluster-1')
    rerender(<OzonPointsMap points={[second]} apiKey="public-key" onSelect={onSelect} />)
    expect(screen.queryByRole('region', { name: 'Пункты в выбранной группе' })).not.toBeInTheDocument()
    maps.clusterClick('cluster-1')
    expect(screen.queryByRole('region', { name: 'Пункты в выбранной группе' })).not.toBeInTheDocument()
    unmount()
    expect(maps.manager.clusters.events.remove).toHaveBeenCalledWith('click', expect.any(Function))
    maps.clusterClick('cluster-1')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('ignores ready callbacks after unmount', () => {
    const maps = mockMaps(true)
    const { unmount } = render(<OzonPointsMap points={[first]} apiKey="public-key" onSelect={vi.fn()} />)
    unmount()
    maps.finishReady()
    expect(maps.Map).not.toHaveBeenCalled()
  })

  it('keeps a readable fallback when coordinates are missing or the script fails', () => {
    const { rerender } = render(<OzonPointsMap points={[{ ...first, coordinates: undefined }]} apiKey="public-key" onSelect={vi.fn()} />)
    expect(screen.getByText(/пока нет координат/)).toBeVisible()
    rerender(<OzonPointsMap points={[first]} apiKey="public-key" onSelect={vi.fn()} />)
    fireEvent.error(document.querySelector('script[src^="https://api-maps.yandex.ru/"]')!)
    expect(screen.getByText(/Карта временно недоступна/)).toBeVisible()
  })
})
