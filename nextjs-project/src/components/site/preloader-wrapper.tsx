'use client'

import nextDynamic from 'next/dynamic'

const Preloader = nextDynamic(
  () => import('@/components/site/preloader').then((m) => ({ default: m.Preloader })),
  { ssr: false }
)

export function PreloaderWrapper() {
  return <Preloader />
}
