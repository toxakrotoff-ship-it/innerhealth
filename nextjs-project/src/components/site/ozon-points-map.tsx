'use client'

import { useEffect, useRef, useState } from 'react'
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
  const mapRef = useRef<MapInstance | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const key = apiKey?.trim() || process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() || ''
  const validPoints = points.filter(hasCoordinates)
  const hasPoints = validPoints.length > 0

  useEffect(() => {
    if (!key || !hasPoints) return
    let cancelled = false
    let initializing = false
    setReady(false)
    setError(false)
    const init = () => {
      if (cancelled || initializing || !window.ymaps) return
      initializing = true
      window.ymaps.ready(() => {
        if (cancelled || !containerRef.current) return
        try {
          mapRef.current = new window.ymaps!.Map(containerRef.current, {
            center: [55.7558, 37.6173], zoom: 10,
          }) as MapInstance
          clearTimeout(timeout)
          clearInterval(poll)
          setError(false)
          setReady(true)
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
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [key, hasPoints])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !window.ymaps) return
    const markers: unknown[] = []
    const visible = points.filter(hasCoordinates)
    try {
      for (const point of visible) {
        const { latitude, longitude } = point.coordinates!
        const marker = new window.ymaps.Placemark([latitude, longitude], {
          hintContent: escapeHtml(`${point.name}: ${point.address}`),
        }, { preset: point.id === selectedId ? 'islands#redIcon' : 'islands#blueIcon' })
        marker.events.add('click', () => onSelectRef.current(point))
        map.geoObjects.add(marker)
        markers.push(marker)
      }
      const selected = visible.find(point => point.id === selectedId)
      if (selected || visible.length === 1) {
        const { latitude, longitude } = (selected ?? visible[0]).coordinates!
        map.setCenter([latitude, longitude], 15)
      } else if (visible.length > 1) {
        const latitudes = visible.map(point => point.coordinates!.latitude)
        const longitudes = visible.map(point => point.coordinates!.longitude)
        map.setBounds([
          [Math.min(...latitudes), Math.min(...longitudes)],
          [Math.max(...latitudes), Math.max(...longitudes)],
        ], { zoomMargin: 32 })
      }
    } catch { setError(true) }
    return () => {
      if (mapRef.current === map) for (const marker of markers) map.geoObjects.remove(marker)
    }
  }, [ready, points, selectedId])

  const message = !hasPoints ? 'Для этих пунктов пока нет координат. Выберите «Заполнить вручную».'
    : !key || error ? mapError : !ready ? 'Загружаем карту…' : null

  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 lg:min-h-[400px]">
      <div ref={containerRef} aria-label="Карта пунктов выдачи Ozon" className="h-[320px] w-full lg:h-[400px]" />
      {message ? <p className="absolute inset-0 flex items-center justify-center bg-gray-100 p-6 text-center text-sm text-gray-700">{message}</p> : null}
    </div>
  )
}
