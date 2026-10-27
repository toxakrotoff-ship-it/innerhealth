/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { OzonPointsMap } from './ozon-points-map'

const first = { id: 1, name: 'Ozon', address: 'Москва, Тверская, 1', coordinates: { latitude: 55.75, longitude: 37.61 } }
const second = { ...first, id: 2, address: 'Казань', coordinates: { latitude: 55.79, longitude: 49.12 } }

function mockMaps(deferReady = false) {
  let finishReady = () => {}
  const map = { geoObjects: { add: vi.fn(), remove: vi.fn() }, setCenter: vi.fn(), setBounds: vi.fn(), destroy: vi.fn() }
  const clicks: Array<() => void> = []
  const Map = vi.fn(function () { return map })
  const Placemark = vi.fn(function () {
    return { events: { add: (_event: string, handler: () => void) => clicks.push(handler) } }
  })
  vi.stubGlobal('ymaps', {
    ready: (callback: () => void) => { if (deferReady) finishReady = callback; else callback() }, Map, Placemark,
  })
  return { map, Map, Placemark, clicks, finishReady: () => finishReady() }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('Ozon pickup map', () => {
  it('selects markers, highlights a list selection and updates equal-length search results without recreating the map', () => {
    const maps = mockMaps()
    const onSelect = vi.fn()
    const { rerender, unmount } = render(<OzonPointsMap points={[first]} apiKey="public-key" onSelect={onSelect} />)
    expect(maps.Placemark).toHaveBeenLastCalledWith([55.75, 37.61], expect.any(Object), { preset: 'islands#blueIcon' })
    maps.clicks[0]()
    expect(onSelect).toHaveBeenCalledWith(first)
    rerender(<OzonPointsMap points={[second]} selectedId={2} apiKey="public-key" onSelect={onSelect} />)
    expect(maps.Placemark).toHaveBeenLastCalledWith([55.79, 49.12], expect.any(Object), { preset: 'islands#redIcon' })
    expect(maps.map.geoObjects.remove).toHaveBeenCalledTimes(1)
    expect(maps.map.setCenter).toHaveBeenLastCalledWith([55.79, 49.12], 15)
    expect(maps.Map).toHaveBeenCalledTimes(1)
    unmount()
    expect(maps.map.destroy).toHaveBeenCalledTimes(1)
  })

  it('fits all search results and escapes markup in marker hints', () => {
    const maps = mockMaps()
    render(<OzonPointsMap points={[{ ...first, name: '<img>' }, second]} apiKey="public-key" onSelect={vi.fn()} />)
    expect(maps.map.setBounds).toHaveBeenCalledWith([[55.75, 37.61], [55.79, 49.12]], { zoomMargin: 32 })
    expect(maps.Placemark.mock.calls[0]).toEqual([[55.75, 37.61], { hintContent: '&lt;img&gt;: Москва, Тверская, 1' }, { preset: 'islands#blueIcon' }])
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
