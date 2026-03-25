'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrandId } from '@/lib/brand/brand'
import { detectCdekWidgetModeFromText } from '@/lib/cdek-widget-mode'
import type { CartLine } from '@/store/cart-store'

declare global {
  interface Window {
    CDEKWidget?: new (params: Record<string, unknown>) => {
      addParcel?: (parcel: unknown) => void
      resetParcels?: () => void
      open?: () => void
      close?: () => void
    }
  }
}

interface CdekWidgetProps {
  brandId?: BrandId
  items: CartLine[]
  /**
   * Optional override for widget `defaultLocation`.
   * Useful for auto-filling city when user has saved addresses.
   */
  defaultLocation?: string
  /**
   * Optional preselection for widget internal `selected` state.
   * - office: PVZ code
   * - door: formatted address string
   */
  selected?: { office?: string | null; door?: string | null }
  onChoose: (payload: {
    deliveryMethod: 'cdek_pvz' | 'cdek_door'
    tariff: { tariffCode: number; deliverySum: number; periodMin: number; periodMax: number }
    cityCode?: number
    city?: string
    pvzCode?: string
    pvzAddress?: string
    doorAddress?: string
  }) => void
  onCalculate: (payload: {
    office: Array<{ tariffCode: number; deliverySum: number; periodMin: number; periodMax: number }>
    door: Array<{ tariffCode: number; deliverySum: number; periodMin: number; periodMax: number }>
  }) => void
  onModeChange?: (deliveryMethod: 'cdek_pvz' | 'cdek_door') => void
}

type WidgetConfigResponse = {
  from: unknown
  goods: Array<{ width: number; height: number; length: number; weight: number }>
  tariffs: { office: number[]; door: number[] }
}

function parseWidgetNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    // Handles "285", "285.5", and "285 RUB"
    const normalized = value.replace(',', '.')
    const match = normalized.match(/-?\d+(\.\d+)?/)
    if (!match) return 0
    const n = Number.parseFloat(match[0])
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function parseWidgetInt(value: unknown): number {
  const n = parseWidgetNumber(value)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

// Load from same-origin to satisfy strict CSP (`script-src 'self' ...`)
const WIDGET_UMD_SRC = '/vendor/cdek-widget.umd.js'

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load script')), { once: true })
      // if already loaded:
      if ((existing as unknown as { readyState?: string }).readyState === 'complete') resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.dataset.loaded = 'false'
    s.onload = () => {
      s.dataset.loaded = 'true'
      resolve()
    }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function CdekWidget({
  brandId,
  items,
  defaultLocation,
  selected,
  onChoose,
  onCalculate,
  onModeChange,
}: CdekWidgetProps) {
  const [instanceKey, setInstanceKey] = useState<string>(() => Math.random().toString(16).slice(2))
  const rootId = useMemo(() => `cdek-widget-${instanceKey}`, [instanceKey])
  const widgetRef = useRef<unknown>(null)
  const onChooseRef = useRef<CdekWidgetProps['onChoose']>(onChoose)
  const onCalculateRef = useRef<CdekWidgetProps['onCalculate']>(onCalculate)
  const onModeChangeRef = useRef<CdekWidgetProps['onModeChange']>(onModeChange)
  const lastKnownModeRef = useRef<'cdek_pvz' | 'cdek_door' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    onChooseRef.current = onChoose
    onCalculateRef.current = onCalculate
    onModeChangeRef.current = onModeChange
  }, [onChoose, onCalculate, onModeChange])

  useEffect(() => {
    function reinitWidget() {
      setInstanceKey(Math.random().toString(16).slice(2))
    }

    function handlePageShow(event: PageTransitionEvent) {
      // bfcache restore: scripts might be present, but widget internal state can be broken.
      if (event.persisted) reinitWidget()
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      // If the page becomes visible and the widget isn't ready, attempt re-init.
      if (!isReady) reinitWidget()
    }

    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isReady])

  useEffect(() => {
    let cancelled = false
    let removeRootInteractionListeners: (() => void) | null = null

    async function run() {
      setError(null)
      setIsReady(false)
      const brandQuery = brandId ? `?brand=${encodeURIComponent(brandId)}` : ''

      const configRes = await fetch(`/api/cdek-widget/config${brandQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      })
      const configJson = (await configRes.json()) as Partial<WidgetConfigResponse> & { error?: string }
      if (!configRes.ok) throw new Error(configJson.error ?? 'Failed to load CDEK widget config')

      await loadScriptOnce(WIDGET_UMD_SRC)
      if (cancelled) return

      if (!window.CDEKWidget) throw new Error('CDEKWidget is not available on window')
      const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new Error('Yandex Maps apiKey is missing (NEXT_PUBLIC_YANDEX_MAPS_API_KEY)')
      }

      widgetRef.current = new window.CDEKWidget({
        root: rootId,
        apiKey,
        // Widget internally appends its own query params (?action=offices/calculate...).
        // If we include our own query (?brand=...), it can break the final URL (double '?')
        // and the backend will not receive `action`.
        servicePath: '/api/cdek-widget/service',
        canChoose: true,
        debug: false,
        from: configJson.from,
        defaultLocation:
          defaultLocation?.trim().length
            ? defaultLocation.trim()
            : typeof (configJson.from as { city?: unknown } | null)?.city === 'string'
              ? ((configJson.from as { city?: string }).city as string)
              : typeof (configJson.from as { address?: unknown } | null)?.address === 'string'
                ? ((configJson.from as { address?: string }).address as string)
                : 'Москва',
        ...(selected?.office || selected?.door
          ? {
              selected: {
                office: selected.office ?? null,
                door: selected.door ?? null,
              },
            }
          : {}),
        goods: configJson.goods ?? [],
        tariffs: configJson.tariffs ?? { office: [234, 136, 138], door: [233, 137, 139] },
        onReady() {
          setIsReady(true)
        },
        onCalculate(tariffs: unknown) {
          const t = tariffs as {
            office?: Array<{ tariff_code: number; delivery_sum: number; period_min: number; period_max: number }>
            door?: Array<{ tariff_code: number; delivery_sum: number; period_min: number; period_max: number }>
          }
          onCalculateRef.current({
            office: (t.office ?? []).map((x) => ({
              tariffCode: x.tariff_code,
              deliverySum: x.delivery_sum,
              periodMin: x.period_min,
              periodMax: x.period_max,
            })),
            door: (t.door ?? []).map((x) => ({
              tariffCode: x.tariff_code,
              deliverySum: x.delivery_sum,
              periodMin: x.period_min,
              periodMax: x.period_max,
            })),
          })
        },
        onChoose(mode: unknown, tariff: unknown, address: unknown) {
          const m = mode === 'office' ? 'cdek_pvz' : 'cdek_door'
          lastKnownModeRef.current = m
          onModeChangeRef.current?.(m)
          const t = tariff as Record<string, unknown>
          const a = address as Record<string, unknown>
          const cityCodeRaw = a.city_code ?? a.code
          const cityCode =
            typeof cityCodeRaw === 'number'
              ? cityCodeRaw
              : typeof cityCodeRaw === 'string'
                ? Number.parseInt(cityCodeRaw, 10)
                : undefined
          onChooseRef.current({
            deliveryMethod: m,
            tariff: {
              tariffCode: parseWidgetInt(t.tariff_code ?? t.tariffCode ?? t.code),
              deliverySum: parseWidgetNumber(t.delivery_sum ?? t.deliverySum ?? t.price ?? t.cost),
              periodMin: parseWidgetInt(t.period_min ?? t.periodMin ?? t.min),
              periodMax: parseWidgetInt(t.period_max ?? t.periodMax ?? t.max),
            },
            cityCode: Number.isFinite(cityCode) && (cityCode as number) > 0 ? (cityCode as number) : undefined,
            city: typeof a.city === 'string' ? a.city : undefined,
            pvzCode: typeof a.code === 'string' ? a.code : undefined,
            pvzAddress: typeof a.address === 'string' ? a.address : undefined,
            doorAddress: typeof a.formatted === 'string' ? a.formatted : undefined,
          })
        },
      })

      const rootEl = document.getElementById(rootId)
      if (!rootEl) return

      const syncMode = (mode: 'cdek_pvz' | 'cdek_door') => {
        if (lastKnownModeRef.current === mode) return
        lastKnownModeRef.current = mode
        onModeChangeRef.current?.(mode)
      }

      const detectModeFromEvent = (event: Event): 'cdek_pvz' | 'cdek_door' | null => {
        const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : []
        for (const node of eventPath) {
          if (!(node instanceof HTMLElement)) continue
          if (!rootEl.contains(node)) continue
          const mode = detectCdekWidgetModeFromText(node.textContent ?? '')
          if (mode) return mode
          if (node === rootEl) break
        }
        return null
      }

      const handleRootInteraction = (event: Event) => {
        const mode = detectModeFromEvent(event)
        if (mode) syncMode(mode)
      }

      rootEl.addEventListener('pointerdown', handleRootInteraction, true)
      rootEl.addEventListener('click', handleRootInteraction, true)
      removeRootInteractionListeners = () => {
        rootEl.removeEventListener('pointerdown', handleRootInteraction, true)
        rootEl.removeEventListener('click', handleRootInteraction, true)
      }
    }

    run().catch((e) => {
      if (cancelled) return
      setError(e instanceof Error ? e.message : 'CDEK widget error')
    })

    return () => {
      cancelled = true
      removeRootInteractionListeners?.()
      widgetRef.current = null
      const rootEl = document.getElementById(rootId)
      if (rootEl) rootEl.innerHTML = ''
    }
  }, [brandId, items, defaultLocation, selected?.door, selected?.office, rootId])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
      <div className="text-lg font-semibold">Доставка (СДЭК)</div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {!error && !isReady ? (
        <div className="text-sm text-gray-600">Загружаем виджет СДЭК…</div>
      ) : null}
      <div id={rootId} style={{ height: 650, width: '100%' }} />
    </div>
  )
}

