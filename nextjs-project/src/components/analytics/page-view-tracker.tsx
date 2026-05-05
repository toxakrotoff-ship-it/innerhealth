'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { logAnalyticsEvent } from '@/lib/analytics/analytics-client'
import { detectAnalyticsDeviceType } from '@/lib/analytics/device-type'
import { resolveClientSiteBrandFromWindow } from '@/lib/brand/client-site-brand'

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function getAnonId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'ih_anon_id'
  const existing = window.localStorage.getItem(key)
  if (existing && existing.length > 0) return existing
  const next = crypto.randomUUID()
  window.localStorage.setItem(key, next)
  return next
}

function getFullPath(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

function getTrackedClickTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null

  const interactive = target.closest<HTMLElement>(
    'a[href],button,[role="button"],input[type="button"],input[type="submit"]'
  )

  if (!interactive) return null
  if (interactive.closest('[data-analytics-click="manual"]')) return null
  if (
    interactive instanceof HTMLButtonElement ||
    interactive instanceof HTMLInputElement
  ) {
    if (interactive.disabled) return null
  }

  return interactive
}

function getClickMeta(target: HTMLElement): Record<string, string> {
  const text = target.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  const href = target instanceof HTMLAnchorElement ? target.href : ''

  return {
    kind: 'ui_click',
    element: target.tagName.toLowerCase(),
    ...(text ? { text: text.slice(0, 200) } : {}),
    ...(href ? { href } : {}),
  }
}

export function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    const fullPath = getFullPath(pathname, searchParams)
    if (lastPathRef.current === fullPath) return
    lastPathRef.current = fullPath

    const anonId = getAnonId()
    const activeBrand = resolveClientSiteBrandFromWindow()
    const width = window.innerWidth
    const deviceType = detectAnalyticsDeviceType({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
      innerWidth: width,
    })

    if (activeBrand === 'inner' && typeof window.ym === 'function') {
      const fullUrl = `${window.location.origin}${fullPath}`
      window.ym(92621260, 'hit', fullUrl, { title: document.title, referer: document.referrer })
      window.ym(94297848, 'hit', fullUrl, { title: document.title, referer: document.referrer })
    }

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

  useEffect(() => {
    if (!pathname) return

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const trackedTarget = getTrackedClickTarget(event.target)
      if (!trackedTarget) return

      logAnalyticsEvent({
        type: 'CLICK',
        path: getFullPath(pathname, searchParams),
        meta: getClickMeta(trackedTarget),
      })
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [pathname, searchParams])

  return null
}
