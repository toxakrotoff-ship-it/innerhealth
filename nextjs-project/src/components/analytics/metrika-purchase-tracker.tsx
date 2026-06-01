'use client'

import { useEffect, useRef } from 'react'
import { logAnalyticsEvent } from '@/lib/analytics/analytics-client'
import { pushMetrikaEcommerceEvent } from '@/lib/analytics/metrika-ecommerce'
import { reachMetrikaGoal } from '@/lib/analytics/metrika'

interface PendingPaymentSnapshot {
  orderId: string
  paymentId: string
  createdAt: string
}

interface MetrikaPurchaseApiPayload {
  ok?: boolean
  eligible?: boolean
  order?: {
    id?: string
    status?: string
    currency?: string
    value?: unknown
    items?: unknown
  }
}

interface MetrikaPurchaseTrackerProps {
  payment?: string
}

const STORAGE_KEY = 'ih_pending_yookassa_payment'

function readPendingSnapshot(): PendingPaymentSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingPaymentSnapshot>
    if (!parsed.orderId || !parsed.paymentId) return null
    return { orderId: String(parsed.orderId), paymentId: String(parsed.paymentId), createdAt: String(parsed.createdAt ?? '') }
  } catch {
    return null
  }
}

export function MetrikaPurchaseTracker({ payment }: MetrikaPurchaseTrackerProps) {
  const sentRef = useRef(false)

  useEffect(() => {
    if (payment !== 'success') return
    if (sentRef.current) return

    const pending = readPendingSnapshot()
    if (!pending) return

    sentRef.current = true

    const url = `/api/orders/${encodeURIComponent(pending.orderId)}/metrika-purchase?paymentId=${encodeURIComponent(pending.paymentId)}`

    void fetch(url, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: MetrikaPurchaseApiPayload | null) => {
        if (!payload?.ok || payload?.eligible !== true) return
        const order = payload.order
        if (!order?.id || order?.status !== 'paid') return

        reachMetrikaGoal('purchase', { orderId: order.id })
        pushMetrikaEcommerceEvent({
          event: 'purchase',
          ecommerce: {
            transaction_id: order.id,
            currency: order.currency ?? 'RUB',
            value: Number(order.value ?? 0),
            items: Array.isArray(order.items) ? order.items : [],
          },
        })

        logAnalyticsEvent({
          type: 'ORDER_CREATED',
          path: '/cart',
          meta: {
            orderId: order.id,
            source: 'payment_return',
          },
        })

        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
      })
      .catch(() => {})
  }, [payment])

  return null
}

