'use client'

export const PAYMENT_REDIRECT_STORAGE_KEY = 'ih_pending_yookassa_redirect'
export const PAYMENT_REDIRECT_UPDATED_EVENT = 'ih:payment-redirect-updated'

const PAYMENT_REDIRECT_MAX_AGE_MS = 50 * 60 * 1000

export interface PendingPaymentRedirect {
  orderId: string
  brandId: string
  url: string
  createdAt: number
}

function validRedirect(value: unknown, now: number): PendingPaymentRedirect | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<PendingPaymentRedirect>
  if (typeof candidate.orderId !== 'string' || !candidate.orderId) return null
  if (typeof candidate.brandId !== 'string' || !candidate.brandId) return null
  if (typeof candidate.url !== 'string') return null
  if (typeof candidate.createdAt !== 'number' || !Number.isFinite(candidate.createdAt)) return null
  if (candidate.createdAt > now || now - candidate.createdAt > PAYMENT_REDIRECT_MAX_AGE_MS) return null
  try {
    if (new URL(candidate.url).protocol !== 'https:') return null
  } catch {
    return null
  }
  return candidate as PendingPaymentRedirect
}

export function readPendingPaymentRedirect(now = Date.now()): PendingPaymentRedirect | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PAYMENT_REDIRECT_STORAGE_KEY)
    if (!raw) return null
    const pending = validRedirect(JSON.parse(raw), now)
    if (!pending) window.sessionStorage.removeItem(PAYMENT_REDIRECT_STORAGE_KEY)
    return pending
  } catch {
    return null
  }
}

export function savePendingPaymentRedirect(orderId: string, brandId: string, url: string): void {
  if (typeof window === 'undefined') return
  const pending = validRedirect({ orderId, brandId, url, createdAt: Date.now() }, Date.now())
  if (!pending) return
  try {
    window.sessionStorage.setItem(PAYMENT_REDIRECT_STORAGE_KEY, JSON.stringify(pending))
    window.dispatchEvent(new Event(PAYMENT_REDIRECT_UPDATED_EVENT))
  } catch {
    // Payment navigation still works when browser storage is unavailable.
  }
}

export function clearPendingPaymentRedirect(orderId: string): void {
  if (typeof window === 'undefined') return
  if (readPendingPaymentRedirect()?.orderId !== orderId) return
  try {
    window.sessionStorage.removeItem(PAYMENT_REDIRECT_STORAGE_KEY)
    window.dispatchEvent(new Event(PAYMENT_REDIRECT_UPDATED_EVENT))
  } catch {
    // ignore
  }
}
