'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { logAnalyticsEvent } from '@/lib/analytics/analytics-client'
import { detectAnalyticsDeviceType } from '@/lib/analytics/device-type'
import { normalizeBrandId, resolveBrandByHost } from '@/lib/brand/brand'

function getAnonId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'ih_anon_id'
  const existing = window.localStorage.getItem(key)
  if (existing && existing.length > 0) return existing
  const next = crypto.randomUUID()
  window.localStorage.setItem(key, next)
  return next
}

export function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    const query = searchParams.toString()
    const fullPath = query ? `${pathname}?${query}` : pathname
    if (lastPathRef.current === fullPath) return
    lastPathRef.current = fullPath

    const anonId = getAnonId()
    const cookieBrand = normalizeBrandId(
      document.cookie
        .split(';')
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith('ih_active_brand='))
        ?.split('=')[1] ?? null
    )
    const activeBrand = cookieBrand ?? resolveBrandByHost(window.location.host)
    const width = window.innerWidth
    const deviceType = detectAnalyticsDeviceType({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
      innerWidth: width,
    })

    logAnalyticsEvent({
      brand: activeBrand,
      type: 'PAGE_VIEW',
      path: fullPath,
      pageTitle: document.title,
      anonId: anonId || undefined,
      meta: {
        deviceType,
        viewportWidth: width,
      },
    })
  }, [pathname, searchParams])

  return null
}

