import 'client-only'

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

export interface MetrikaEcommerceItem {
  readonly item_id: string
  readonly item_name?: string
  readonly price?: number
  readonly quantity?: number
  readonly item_category?: string
}

export interface MetrikaEcommerceEventPayload {
  readonly event: string
  readonly ecommerce: {
    readonly items: readonly MetrikaEcommerceItem[]
    readonly currency?: string
    readonly value?: number
    readonly transaction_id?: string
    readonly shipping?: number
  }
}

function getSafeDataLayer(): unknown[] | null {
  if (typeof window === 'undefined') return null
  window.dataLayer = window.dataLayer || []
  return window.dataLayer
}

export function pushMetrikaEcommerceEvent(payload: MetrikaEcommerceEventPayload): void {
  const dataLayer = getSafeDataLayer()
  if (!dataLayer) return
  dataLayer.push(payload)
}

