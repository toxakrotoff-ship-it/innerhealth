import type { BrandId } from '@/lib/brand/brand'

/**
 * Клиентские обёртки над checkout-tracking API. Все вызовы — fire-and-forget:
 * ошибки трекинга не должны мешать оформлению заказа (см. checkout-tracking.ts).
 */

function withBrand(path: string, brandId?: BrandId): string {
  return brandId ? `${path}${path.includes('?') ? '&' : '?'}brand=${encodeURIComponent(brandId)}` : path
}

export async function startCheckoutSession(brandId?: BrandId): Promise<string | null> {
  try {
    const res = await fetch(withBrand('/api/checkout/session', brandId), { method: 'POST' })
    if (!res.ok) return null
    const data = (await res.json()) as { sessionId?: string }
    return data.sessionId ?? null
  } catch {
    return null
  }
}

function patchCheckoutSession(
  sessionId: string,
  segment: string,
  brandId: BrandId | undefined,
  body: Record<string, unknown>
): void {
  fetch(withBrand(`/api/checkout/session/${sessionId}/${segment}`, brandId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export function patchCheckoutContact(
  sessionId: string,
  brandId: BrandId | undefined,
  contact: { fullName?: string; phone?: string; email?: string }
): void {
  patchCheckoutSession(sessionId, 'contact', brandId, contact)
}

export function patchCheckoutCart(
  sessionId: string,
  brandId: BrandId | undefined,
  cart: {
    items: Array<{ productId: string; title?: string; quantity: number; price: number }>
    cartTotal?: number
    deliveryMethod?: string
    deliverySum?: number
    promoCode?: string
  }
): void {
  patchCheckoutSession(sessionId, 'cart', brandId, cart)
}

export function patchCheckoutDelivery(
  sessionId: string,
  brandId: BrandId | undefined,
  delivery: { deliveryMethod: string; deliverySum?: number }
): void {
  patchCheckoutSession(sessionId, 'delivery', brandId, delivery)
}

export function patchCheckoutPromo(
  sessionId: string,
  brandId: BrandId | undefined,
  promoCode: string
): void {
  patchCheckoutSession(sessionId, 'promo', brandId, { promoCode })
}
