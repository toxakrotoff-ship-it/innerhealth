'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { logAnalyticsEvent } from '@/lib/analytics/analytics-client'

interface CatalogZeroHitReporterProps {
  /** Normalized search query from server (same as catalog `q`). */
  query: string
  /** True if the product list has at least one item. */
  hasProducts: boolean
}

/**
 * Logs empty catalog search: DB row + internal analytics + optional Yandex Metrika goal.
 */
export function CatalogZeroHitReporter({ query, hasProducts }: CatalogZeroHitReporterProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sentRef = useRef(false)

  useEffect(() => {
    const q = query.trim()
    if (hasProducts || q.length < 2 || sentRef.current) return
    sentRef.current = true

    const fullPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname

    void fetch('/api/catalog/zero-hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, path: fullPath.startsWith('/') ? fullPath : `/catalog` }),
      keepalive: true,
    }).catch(() => {})

    logAnalyticsEvent({
      type: 'CLICK',
      path: fullPath || '/catalog',
      meta: {
        kind: 'catalog_search_zero',
        query: q,
      },
    })

    const counterId = process.env.NEXT_PUBLIC_YM_COUNTER_ID?.trim()
    if (!counterId || typeof window === 'undefined') return
    const w = window as unknown as { ym?: (id: string, method: string, goal: string, params?: object) => void }
    try {
      w.ym?.(counterId, 'reachGoal', 'catalog_search_zero', { query: q })
    } catch {
      // ignore
    }
  }, [query, hasProducts, pathname, searchParams])

  return null
}
