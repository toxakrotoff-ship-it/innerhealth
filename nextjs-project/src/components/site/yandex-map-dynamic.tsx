'use client'

import dynamic from 'next/dynamic'

/** Client-only wrapper: loads Yandex Map outside the initial bundle (ssr: false). */
export const YandexMapDynamic = dynamic(
  () => import('./yandex-map').then((m) => ({ default: m.YandexMap })),
  { ssr: false }
)
