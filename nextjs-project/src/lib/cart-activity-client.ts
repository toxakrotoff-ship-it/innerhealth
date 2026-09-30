'use client'

import type { BrandId } from '@/lib/brand/brand'
import { cartActivityActions, sanitizeCartActivityData, type CartActivityEvent } from '@/lib/cart-activity'

let sessionId: string | null = null
let brandId: BrandId | undefined
let queue: CartActivityEvent[] = []
let flushTimer: number | null = null

function endpoint(): string | null {
  if (!sessionId) return null
  const query = brandId ? `?brand=${encodeURIComponent(brandId)}` : ''
  return `/api/checkout/session/${encodeURIComponent(sessionId)}/activity${query}`
}

export function bindCartActivitySession(id: string | null, brand?: BrandId): void {
  if (!id) {
    if (flushTimer != null && typeof window !== 'undefined') window.clearTimeout(flushTimer)
    flushTimer = null
    queue = []
  }
  sessionId = id
  brandId = brand
  if (id) scheduleFlush(0)
}

function scheduleFlush(delay = 1500): void {
  if (flushTimer != null || !sessionId || typeof window === 'undefined') return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushCartActivity()
  }, delay)
}

export async function flushCartActivity(): Promise<void> {
  const url = endpoint()
  if (!url || queue.length === 0) return
  const activeSessionId = sessionId
  const events = queue.splice(0, 25)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    })
    if (!response.ok && sessionId === activeSessionId && ![400, 404, 413].includes(response.status)) {
      queue = [...events, ...queue].slice(0, 200)
    }
  } catch {
    if (sessionId === activeSessionId) queue = [...events, ...queue].slice(0, 200)
  }
  if (queue.length > 0) scheduleFlush(3000)
}

export function trackCartActivity(input: {
  scope: CartActivityEvent['scope']
  action: string
  data?: Record<string, unknown>
}): void {
  if (!(cartActivityActions as readonly string[]).includes(input.action)) return
  queue.push({
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    scope: input.scope,
    action: input.action as CartActivityEvent['action'],
    occurredAt: new Date().toISOString(),
    data: sanitizeCartActivityData(input.data),
  })
  if (queue.length > 200) queue.shift()
  scheduleFlush()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    const url = endpoint()
    if (!url || queue.length === 0) return
    try {
      while (queue.length > 0) {
        const events = queue.slice(0, 25)
        const sent = navigator.sendBeacon(url, new Blob([JSON.stringify({ events })], { type: 'application/json' }))
        if (!sent) break
        queue.splice(0, events.length)
      }
    } catch {
      // Checkout must not depend on analytics transport.
    }
  })
}
