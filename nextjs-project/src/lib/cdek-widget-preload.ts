import type { BrandId } from '@/lib/brand/brand'
import { buildCdekWidgetItemsSignature, getCdekWidgetCartLines } from '@/lib/cdek-widget-items'
import '@/lib/cdek-widget-types'
import type { CartLine } from '@/store/cart-store'

export interface CdekWidgetConfigResponse {
  from: unknown
  goods: Array<{ width: number; height: number; length: number; weight: number }>
  tariffs: { office: number[]; door: number[] }
}

const WIDGET_UMD_SRC = '/vendor/cdek-widget.umd.js'

const configCache = new Map<string, Promise<CdekWidgetConfigResponse>>()
let widgetScriptPromise: Promise<void> | null = null
let umdPreloadLinkAttached = false

function buildConfigCacheKey(brandId: BrandId | undefined, items: readonly CartLine[]): string {
  const brandQuery = brandId ? `?brand=${encodeURIComponent(brandId)}` : ''
  return `${brandQuery}|${buildCdekWidgetItemsSignature(items)}`
}

export async function fetchCdekWidgetConfig(params: {
  brandId?: BrandId
  items: readonly CartLine[]
}): Promise<CdekWidgetConfigResponse> {
  const brandQuery = params.brandId ? `?brand=${encodeURIComponent(params.brandId)}` : ''
  const widgetItems = getCdekWidgetCartLines(params.items)
  const configRes = await fetch(`/api/cdek-widget/config${brandQuery}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: widgetItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    }),
  })
  const configJson = (await configRes.json()) as Partial<CdekWidgetConfigResponse> & { error?: string }
  if (!configRes.ok) {
    throw new Error(configJson.error ?? 'Failed to load CDEK widget config')
  }
  return configJson as CdekWidgetConfigResponse
}

export function getCachedCdekWidgetConfig(params: {
  brandId?: BrandId
  items: readonly CartLine[]
}): Promise<CdekWidgetConfigResponse> {
  const cacheKey = buildConfigCacheKey(params.brandId, params.items)
  const cached = configCache.get(cacheKey)
  if (cached) return cached

  const request = fetchCdekWidgetConfig(params).catch((error) => {
    configCache.delete(cacheKey)
    throw error
  })
  configCache.set(cacheKey, request)
  return request
}

function finishCdekScriptLoad(resolve: () => void, reject: (error: Error) => void): void {
  if (window.CDEKWidget) {
    resolve()
    return
  }
  reject(new Error('CDEKWidget is not available after script load'))
}

export function loadCdekWidgetScriptOnce(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.CDEKWidget) return Promise.resolve()
  if (widgetScriptPromise) return widgetScriptPromise

  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_UMD_SRC}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        finishCdekScriptLoad(resolve, reject)
        return
      }
      existing.addEventListener('load', () => finishCdekScriptLoad(resolve, reject), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load CDEK widget script')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = WIDGET_UMD_SRC
    script.async = true
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      finishCdekScriptLoad(resolve, reject)
    }
    script.onerror = () => reject(new Error(`Failed to load ${WIDGET_UMD_SRC}`))
    document.head.appendChild(script)
  }).catch((error) => {
    widgetScriptPromise = null
    throw error
  })

  return widgetScriptPromise
}

function preconnectYandexMaps(): void {
  if (typeof document === 'undefined') return

  const origins = ['https://api-maps.yandex.ru', 'https://yastatic.net']
  for (const href of origins) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = href
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  }
}

/** @deprecated Widget owns Yandex Maps v3 init; only preconnect here to avoid broken double-load. */
export function preloadCdekYandexMapsV3(): Promise<void> {
  preconnectYandexMaps()
  return Promise.resolve()
}

function attachUmdPreloadLink(): void {
  if (typeof document === 'undefined' || umdPreloadLinkAttached) return
  if (document.querySelector(`link[rel="preload"][href="${WIDGET_UMD_SRC}"]`)) {
    umdPreloadLinkAttached = true
    return
  }

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = WIDGET_UMD_SRC
  link.as = 'script'
  document.head.appendChild(link)
  umdPreloadLinkAttached = true
}

/** Warm up UMD, Yandex Maps v3 and widget config in parallel (safe to call repeatedly). */
export function warmupCdekWidget(params: {
  brandId?: BrandId
  items: readonly CartLine[]
}): void {
  if (typeof window === 'undefined') return
  if (getCdekWidgetCartLines(params.items).length === 0) return

  attachUmdPreloadLink()
  preconnectYandexMaps()
  void loadCdekWidgetScriptOnce().catch(() => {})
  void getCachedCdekWidgetConfig(params).catch(() => {})
}

/** @deprecated Use warmupCdekWidget */
export function preloadCdekWidgetScript(): void {
  warmupCdekWidget({ items: [] })
  void loadCdekWidgetScriptOnce().catch(() => {})
}
