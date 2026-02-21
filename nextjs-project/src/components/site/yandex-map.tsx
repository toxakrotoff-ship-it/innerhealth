'use client'

import { useEffect, useRef } from 'react'

const MAP_CENTER: [number, number] = [55.78284, 37.45149]
const MAP_ZOOM = 16

/** Тип экземпляра карты (совместим с объявлением в yandex-map-pvz.tsx) */
interface YandexMapInstance {
  geoObjects: { add: (obj: unknown) => void }
  destroy: () => void
}

interface YandexMapProps {
  className?: string
  /** Yandex Maps API key (optional for low traffic). Set NEXT_PUBLIC_YANDEX_MAPS_API_KEY. */
  apiKey?: string
}

/**
 * Embeds Yandex Map with a single placemark.
 * Loads the Yandex Maps JS API script and initializes the map on client.
 */
export function YandexMap({ className = '', apiKey }: YandexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<YandexMapInstance | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const key = apiKey ?? process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? ''
    const scriptUrl = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`

    const initMap = () => {
      if (!window.ymaps) return
      window.ymaps.ready(() => {
        if (!containerRef.current) return
        const prevMap = mapRef.current
        if (prevMap) prevMap.destroy()
        const myMap = new window.ymaps!.Map(containerRef.current, {
          center: MAP_CENTER,
          zoom: MAP_ZOOM,
        })
        const placemark = new window.ymaps!.Placemark(MAP_CENTER)
        myMap.geoObjects.add(placemark)
        mapRef.current = myMap
      })
    }

    let script: HTMLScriptElement | null = null

    if (window.ymaps) {
      initMap()
      return () => {
        mapRef.current?.destroy()
        mapRef.current = null
      }
    }

    script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.onload = initMap
    document.head.appendChild(script)

    return () => {
      mapRef.current?.destroy()
      mapRef.current = null
      script?.remove()
    }
  }, [apiKey])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '320px' }}
      aria-label="Карта: шоурум Inner Health"
    />
  )
}
