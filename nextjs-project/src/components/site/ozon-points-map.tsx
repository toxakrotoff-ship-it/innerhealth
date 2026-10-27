'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {} from './yandex-map-pvz'

export interface OzonMapPoint {
  id: number
  name: string
  address: string
  coordinates?: { latitude: number; longitude: number }
}

interface Props {
  points: OzonMapPoint[]
  selectedId?: number
  apiKey?: string
  onSelect: (point: OzonMapPoint) => void
}

type MapInstance = InstanceType<NonNullable<Window['ymaps']>['Map']> & {
  setBounds: (bounds: number[][], options: { zoomMargin: number }) => void
}

interface ObjectClick { get: (name: string) => unknown }
interface MapEvents {
  add: (name: string, callback: (event: ObjectClick) => void) => void
  remove: (name: string, callback: (event: ObjectClick) => void) => void
}
interface PointFeature {
  type: 'Feature'
  id: number
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: { hintContent: string }
  options: { preset: string }
}
interface PointManager {
  add: (collection: { type: 'FeatureCollection'; features: PointFeature[] }) => void
  removeAll: () => void
  objects: {
    events: MapEvents
    setObjectOptions: (id: number, options: { preset: string }) => void
  }
  clusters?: {
    events: MapEvents
    getById: (id: number | string) => { properties?: { geoObjects?: Array<{ id: number }> } } | undefined
  }
}
type ObjectManagerApi = NonNullable<Window['ymaps']> & {
  ObjectManager: new (options: { clusterize: boolean; gridSize: number; clusterOpenBalloonOnClick: boolean; geoObjectOpenBalloonOnClick: boolean }) => PointManager
}
interface MapLayer { map: MapInstance; manager: PointManager }

const mapError = 'Карта временно недоступна. Выберите «Заполнить вручную».'
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!)

function hasCoordinates(point: OzonMapPoint): boolean {
  const coordinates = point.coordinates
  return Boolean(coordinates && Number.isFinite(coordinates.latitude) && Math.abs(coordinates.latitude) <= 90 &&
    Number.isFinite(coordinates.longitude) && Math.abs(coordinates.longitude) <= 180)
}

/** The list stays usable if the external map API or coordinates are unavailable. */
export function OzonPointsMap({ points, selectedId, apiKey, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [layer, setLayer] = useState<MapLayer | null>(null)
  const [error, setError] = useState(false)
  const previousSelected = useRef<number | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const key = apiKey?.trim() || process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() || ''
  const validPoints = useMemo(() => points.filter(hasCoordinates), [points])
  const pointsById = useMemo(() => new Map(validPoints.map(point => [point.id, point])), [validPoints])
  const [clusterChoice, setClusterChoice] = useState<{ dataset: typeof pointsById; ids: number[] } | null>(null)
  const clusterPoints = clusterChoice?.dataset === pointsById
    ? clusterChoice.ids.flatMap(id => pointsById.get(id) ?? []) : []
  const pointLookupRef = useRef(pointsById)
  pointLookupRef.current = pointsById
  const hasPoints = validPoints.length > 0

  useEffect(() => {
    setLayer(null)
    setError(false)
    if (!key || !hasPoints) return
    let cancelled = false
    let initializing = false
    let createdLayer: MapLayer | null = null
    const onObjectClick = (event: ObjectClick) => {
      const rawId = event.get('objectId')
      const id = typeof rawId === 'number' ? rawId : typeof rawId === 'string' && /^\d+$/.test(rawId) ? Number(rawId) : NaN
      const point = pointLookupRef.current.get(id)
      if (point) {
        setClusterChoice(null)
        onSelectRef.current(point)
      }
    }
    const onClusterClick = (event: ObjectClick) => {
      const id = event.get('objectId')
      if (cancelled || (typeof id !== 'number' && typeof id !== 'string')) return
      const members = createdLayer?.manager.clusters?.getById(id)?.properties?.geoObjects ?? []
      const dataset = pointLookupRef.current
      const ids = [...new Set(members.map(point => point.id))].filter(pointId => dataset.has(pointId))
      setClusterChoice(ids.length ? { dataset, ids } : null)
    }
    const init = () => {
      const maps = window.ymaps as ObjectManagerApi | undefined
      if (cancelled || initializing || !maps) return
      initializing = true
      maps.ready(() => {
        if (cancelled || !containerRef.current) return
        try {
          const map = new maps.Map(containerRef.current, {
            center: [55.7558, 37.6173], zoom: 10,
          }) as MapInstance
          try {
            const manager = new maps.ObjectManager({ clusterize: true, gridSize: 64, clusterOpenBalloonOnClick: false, geoObjectOpenBalloonOnClick: false })
            manager.objects.events.add('click', onObjectClick)
            manager.clusters?.events.add('click', onClusterClick)
            map.geoObjects.add(manager)
            createdLayer = { map, manager }
          } catch (error) { map.destroy(); throw error }
          clearTimeout(timeout)
          clearInterval(poll)
          setError(false)
          setLayer(createdLayer)
        } catch { setError(true) }
      })
    }
    const fail = () => {
      clearInterval(poll)
      if (!cancelled) setError(true)
    }
    const timeout = setTimeout(fail, 15_000)
    // An existing script may already have fired its load event in another component.
    const poll = setInterval(init, 100)
    let script = document.querySelector<HTMLScriptElement>('script[src^="https://api-maps.yandex.ru/2.1/"]')
    if (!script && !window.ymaps) {
      script = document.createElement('script')
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`
      script.async = true
      document.head.appendChild(script)
    }
    script?.addEventListener('load', init)
    script?.addEventListener('error', fail)
    init()
    return () => {
      cancelled = true
      clearTimeout(timeout)
      clearInterval(poll)
      script?.removeEventListener('load', init)
      script?.removeEventListener('error', fail)
      if (createdLayer) {
        try {
          createdLayer.manager.objects.events.remove('click', onObjectClick)
          createdLayer.manager.clusters?.events.remove('click', onClusterClick)
          createdLayer.manager.removeAll()
          createdLayer.map.geoObjects.remove(createdLayer.manager)
        } finally { createdLayer.map.destroy() }
      }
      previousSelected.current = null
    }
  }, [key, hasPoints])

  useEffect(() => {
    setClusterChoice(null)
    if (!layer) return
    const { map, manager } = layer
    try {
      // ObjectManager renders only visible overlays and clusters the city in one bulk operation.
      manager.removeAll()
      manager.add({ type: 'FeatureCollection', features: validPoints.map((point): PointFeature => {
        const { latitude, longitude } = point.coordinates!
        return { type: 'Feature', id: point.id, geometry: { type: 'Point', coordinates: [latitude, longitude] },
          properties: { hintContent: escapeHtml(`${point.name}: ${point.address}`) }, options: { preset: 'islands#blueIcon' } }
      }) })
      previousSelected.current = null
      if (validPoints.length === 1) {
        const { latitude, longitude } = validPoints[0].coordinates!
        map.setCenter([latitude, longitude], 15)
      } else if (validPoints.length > 1) {
        const bounds = validPoints.reduce((bounds, point) => {
          const { latitude, longitude } = point.coordinates!
          return [[Math.min(bounds[0][0], latitude), Math.min(bounds[0][1], longitude)],
            [Math.max(bounds[1][0], latitude), Math.max(bounds[1][1], longitude)]]
        }, [[Infinity, Infinity], [-Infinity, -Infinity]])
        map.setBounds(bounds, { zoomMargin: 32 })
      }
      setError(false)
    } catch { setError(true) }
  }, [layer, validPoints])

  useEffect(() => {
    setClusterChoice(null)
    if (!layer) return
    try {
      if (previousSelected.current !== null && pointsById.has(previousSelected.current)) {
        layer.manager.objects.setObjectOptions(previousSelected.current, { preset: 'islands#blueIcon' })
      }
      const selected = selectedId === undefined ? undefined : pointsById.get(selectedId)
      if (selected) {
        layer.manager.objects.setObjectOptions(selected.id, { preset: 'islands#redIcon' })
        layer.map.setCenter([selected.coordinates!.latitude, selected.coordinates!.longitude], 15)
      }
      previousSelected.current = selected?.id ?? null
    } catch { setError(true) }
  }, [layer, selectedId, pointsById])

  const message = !hasPoints ? 'Для этих пунктов пока нет координат. Выберите «Заполнить вручную».'
    : !key || error ? mapError : !layer ? 'Загружаем карту…' : null

  return (
    <div className="space-y-2">
      <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 lg:min-h-[400px]">
        <div ref={containerRef} aria-label="Карта пунктов выдачи Ozon" className="h-[320px] w-full lg:h-[400px]" />
        {message ? <p className="absolute inset-0 flex items-center justify-center bg-gray-100 p-6 text-center text-sm text-gray-700">{message}</p> : null}
      </div>
      {!message && clusterPoints.length > 0 ? (
        <section aria-label="Пункты в выбранной группе" className="rounded-xl border border-gray-200 p-3">
          <p className="mb-2 text-sm text-gray-700">В этой группе несколько пунктов. Выберите нужный:</p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {clusterPoints.map(point => <li key={point.id}>
              <button type="button" aria-label={`${point.name}: ${point.address}`} className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 focus-visible:outline focus-visible:outline-2" onClick={() => {
                setClusterChoice(null)
                onSelectRef.current(point)
              }}>
                <span className="block font-medium">{point.name}</span>
                <span className="block text-sm text-gray-600">{point.address}</span>
              </button>
            </li>)}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
