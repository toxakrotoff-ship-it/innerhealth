'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useCartStore } from '@/store/cart-store'
import { usePromoStore } from '@/store/promo-store'

interface GiftApiResponse {
  gifts: Array<{ giftProductId: string; quantity: number; giftPromotionId: string }>
}

function buildNonGiftKey(
  items: Array<{
    productId: string
    quantity: number
    isGift?: boolean
  }>
): string {
  return items
    .filter((i) => i.isGift !== true)
    .map((i) => `${i.productId}:${i.quantity}`)
    .sort()
    .join('|')
}

export function CartGiftSync() {
  const items = useCartStore((s) => s.items)
  const applyGiftLines = useCartStore((s) => s.applyGiftLines)
  const hasPromoCode = usePromoStore((s) => s.hasPromoCode)

  const nonGiftKey = useMemo(() => buildNonGiftKey(items), [items])
  const debounceRef = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    abortRef.current = null

    debounceRef.current = window.setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller

      const payload = {
        items: items
          .filter((i) => i.isGift !== true)
          .map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        hasPromoCode,
      }

      void fetch('/api/cart/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: controller.signal,
      })
        .then(async (r) => {
          const data = (await r.json()) as GiftApiResponse | { error?: string }
          if (!r.ok) return
          applyGiftLines({ gifts: (data as GiftApiResponse).gifts })
        })
        .catch(() => {})
    }, 300)

    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current)
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [nonGiftKey, items, hasPromoCode, applyGiftLines])

  return null
}

