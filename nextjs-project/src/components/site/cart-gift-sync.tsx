'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useCartStore } from '@/store/cart-store'
import { usePromoStore } from '@/store/promo-store'

interface GiftApiResponse {
  gifts: Array<{ giftProductId: string; quantity: number; giftPromotionId: string }>
}

function getCookieValue(key: string): string | null {
  if (typeof document === 'undefined') return null
  const cookie = document.cookie
  if (!cookie) return null
  const parts = cookie.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex < 0) continue
    const cookieKey = trimmed.slice(0, eqIndex).trim()
    if (cookieKey !== key) continue
    return decodeURIComponent(trimmed.slice(eqIndex + 1).trim())
  }
  return null
}

function buildNonGiftKey(
  items: Array<{
    productId: string
    quantity: number
    price?: number
    hasPromoPrice?: boolean
    isGift?: boolean
  }>
): string {
  return items
    .filter((i) => i.isGift !== true)
    .map((i) => `${i.productId}:${i.quantity}:${i.price ?? 0}:${i.hasPromoPrice ? 1 : 0}`)
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

      const brandId = getCookieValue('ih_active_brand')
      const payload = {
        items: items
          .filter((i) => i.isGift !== true)
          .map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price ?? 0,
            hasPromoPrice: Boolean(i.hasPromoPrice),
          })),
        hasPromoCode,
        brandId: brandId ?? null,
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

