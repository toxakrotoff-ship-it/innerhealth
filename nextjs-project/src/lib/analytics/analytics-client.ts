'use client'

import type { AnalyticsEventInput } from '@/lib/analytics/analytics-event-schema'

export interface AnalyticsEventClientInput
  extends Omit<AnalyticsEventInput, 'occurredAt'> {
  readonly occurredAt?: Date
}

const ANALYTICS_ENDPOINT = '/api/analytics/events'

let queue: AnalyticsEventClientInput[] = []
let flushTimer: number | null = null

function scheduleFlush() {
  if (flushTimer != null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushQueue()
  }, 5000)
}

async function flushQueue() {
  if (queue.length === 0) return
  const toSend = queue
  queue = []

  try {
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        toSend.map((event) => ({
          ...event,
          occurredAt: event.occurredAt?.toISOString() ?? new Date().toISOString(),
        }))
      ),
      keepalive: true,
    })
  } catch (err) {
    // Не шумим в консоли в проде, только debug.
    console.debug('Analytics flush failed', err)
  }
}

export function logAnalyticsEvent(event: AnalyticsEventClientInput): void {
  queue.push({
    ...event,
    occurredAt: event.occurredAt ?? new Date(),
  })
  scheduleFlush()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (queue.length === 0) return
    const toSend = queue
    queue = []
    try {
      navigator.sendBeacon(
        ANALYTICS_ENDPOINT,
        JSON.stringify(
          toSend.map((event) => ({
            ...event,
            occurredAt: event.occurredAt?.toISOString() ?? new Date().toISOString(),
          }))
        )
      )
    } catch {
      // ignore
    }
  })
}

