'use client'

import { useEffect, useRef, useState } from 'react'

const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173]
const DEFAULT_ZOOM = 10
const YMAPS_WAIT_TIMEOUT_MS = 15_000

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
  /** Ключ API Яндекс.Карт (обязателен). Либо передайте сюда, либо задайте NEXT_PUBLIC_YANDEX_MAPS_API_KEY */
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
  const [loadError, setLoadError] = useState<string | null>(null)

  const key = apiKey ?? (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY : undefined) ?? ''
  const hasKey = Boolean(key?.trim())

  const coords = points
    .map((p) => {
      const lat = p.location?.latitude
      const lon = p.location?.longitude
      if (lat == null || lon == null) return null
      return [lat, lon] as [number, number]
    })
    .filter(Boolean) as [number, number][]

  useEffect(() => {
    setLoadError(null)
    const container = containerRef.current
    if (!container || !hasKey) return

    const scriptUrl = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`

    const initMap = () => {
      if (!window.ymaps) return
      window.ymaps.ready(() => {
        if (!containerRef.current) return
        setLoadError(null)
        if (mapRef.current) mapRef.current.destroy()
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild)
        }
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
      document.querySelector(`script[src="${scriptUrl}"]`)

    if (window.ymaps) {
      initMap()
      return () => {
        mapRef.current?.destroy()
        mapRef.current = null
        placemarksRef.current = []
      }
    }

    if (scriptAlreadyInPage) {
      const deadline = Date.now() + YMAPS_WAIT_TIMEOUT_MS
      const checkYmaps = setInterval(() => {
        if (window.ymaps) {
          clearInterval(checkYmaps)
          initMap()
        } else if (Date.now() > deadline) {
          clearInterval(checkYmaps)
          setLoadError('Не удалось загрузить карту. Проверьте API-ключ Яндекс.Карт.')
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
    script.onerror = () => {
      setLoadError('Не удалось загрузить карту. Проверьте NEXT_PUBLIC_YANDEX_MAPS_API_KEY (см. docs/yandex-maps-env.md).')
    }
    document.head.appendChild(script)
    return () => {
      script.remove()
      mapRef.current?.destroy()
      mapRef.current = null
      placemarksRef.current = []
    }
  }, [hasKey, key, points.length, coords.length, selectedCode, apiKey])

  const showPlaceholder = !hasKey || loadError
  const placeholderMessage = !hasKey
    ? 'Для отображения карты пунктов выдачи укажите ключ API Яндекс.Карт (NEXT_PUBLIC_YANDEX_MAPS_API_KEY) в настройках проекта.'
    : loadError ?? ''

  return (
    <div
      ref={containerRef}
      className={showPlaceholder ? `${className} flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200 text-center` : className}
      style={{ minHeight: '320px' }}
      aria-label="Карта пунктов выдачи СДЭК"
    >
      {showPlaceholder && (
        <p className={`text-sm px-4 ${loadError ? 'text-red-600' : 'text-gray-600'}`}>
          {placeholderMessage}
        </p>
      )}
    </div>
  )
}
