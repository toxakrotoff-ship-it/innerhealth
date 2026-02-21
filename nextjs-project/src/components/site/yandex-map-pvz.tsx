'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173]
const DEFAULT_ZOOM = 10

interface PvzPoint {
  code?: string
  location?: { latitude?: number; longitude?: number }
}

interface YandexMapPvzProps {
  className?: string
  /** ПВЗ с координатами */
  points: PvzPoint[]
  /** Код выбранного ПВЗ */
  selectedCode?: string
  /** При выборе маркера */
  onSelect?: (code: string) => void
  apiKey?: string
}

interface YandexMapInstance {
  geoObjects: { add: (obj: unknown) => void; remove: (obj: unknown) => void }
  setCenter: (center: [number, number], zoom?: number) => void
  destroy: () => void
}

declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void
      Map: new (
        element: string | HTMLElement,
        state: { center: [number, number]; zoom: number }
      ) => YandexMapInstance
      Placemark: new (
        coords: [number, number],
        props?: { hintContent?: string; balloonContent?: string },
        options?: { preset?: string }
      ) => { events: { add: (e: string, cb: () => void) => void }; code?: string }
    }
  }
}

/**
 * Карта с маркерами ПВЗ СДЭК. По клику на маркер вызывается onSelect(code).
 */
export function YandexMapPvz({
  className = '',
  points,
  selectedCode,
  onSelect,
  apiKey,
}: YandexMapPvzProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<YandexMapInstance | null>(null)
  const placemarksRef = useRef<unknown[]>([])

  const coords = points
    .map((p) => {
      const lat = p.location?.latitude
      const lon = p.location?.longitude
      if (lat == null || lon == null) return null
      return [lat, lon] as [number, number]
    })
    .filter(Boolean) as [number, number][]

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const key = apiKey ?? process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? ''
    const scriptUrl = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`

    const initMap = () => {
      if (!window.ymaps) return
      window.ymaps.ready(() => {
        if (!containerRef.current) return
        if (mapRef.current) mapRef.current.destroy()
        const center =
          coords.length > 0
            ? coords.reduce(
                (a, c) => [a[0] + c[0], a[1] + c[1]],
                [0, 0]
              ).map((v, i) => v / coords.length) as [number, number]
            : DEFAULT_CENTER
        const myMap = new window.ymaps!.Map(containerRef.current, {
          center,
          zoom: coords.length > 0 ? 11 : DEFAULT_ZOOM,
        })
        mapRef.current = myMap
        placemarksRef.current = []
        points.forEach((p, i) => {
          const lat = p.location?.latitude
          const lon = p.location?.longitude
          if (lat == null || lon == null) return
          const placemark = new window.ymaps!.Placemark(
            [lat, lon],
            { hintContent: p.code ?? String(i), balloonContent: p.code ?? '' },
            { preset: selectedCode === p.code ? 'islands#redIcon' : 'islands#blueIcon' }
          )
          if (p.code && onSelect) {
            ;(placemark as { events: { add: (e: string, cb: () => void) => void } }).events.add(
              'click',
              () => onSelect(p.code!)
            )
          }
          myMap.geoObjects.add(placemark)
          placemarksRef.current.push(placemark)
        })
      })
    }

    const scriptAlreadyInPage =
      typeof document !== 'undefined' &&
      document.querySelector(`script[src^="https://api-maps.yandex.ru/2.1/"]`)

    if (window.ymaps) {
      initMap()
      return () => {
        mapRef.current?.destroy()
        mapRef.current = null
        placemarksRef.current = []
      }
    }

    if (scriptAlreadyInPage) {
      const checkYmaps = setInterval(() => {
        if (window.ymaps) {
          clearInterval(checkYmaps)
          initMap()
        }
      }, 50)
      return () => {
        clearInterval(checkYmaps)
        mapRef.current?.destroy()
        mapRef.current = null
        placemarksRef.current = []
      }
    }

    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.onload = initMap
    document.head.appendChild(script)
    return () => {
      mapRef.current?.destroy()
      mapRef.current = null
      placemarksRef.current = []
    }
  }, [points.length, coords.length, selectedCode, apiKey])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '320px' }}
      aria-label="Карта пунктов выдачи СДЭК"
    />
  )
}
