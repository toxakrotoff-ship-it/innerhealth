'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrandId } from '@/lib/brand/brand'
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
}

type WidgetConfigResponse = {
  from: unknown
  goods: Array<{ width: number; height: number; length: number; weight: number }>
  tariffs: { office: number[]; door: number[] }
}

// Load from same-origin to satisfy strict CSP (`script-src 'self' ...`)
const WIDGET_UMD_SRC = '/vendor/cdek-widget.umd.js'

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load script')), { once: true })
      // if already loaded:
      if ((existing as unknown as { readyState?: string }).readyState === 'complete') resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function CdekWidget({ brandId, items, onChoose, onCalculate }: CdekWidgetProps) {
  const rootId = useMemo(() => `cdek-widget-${Math.random().toString(16).slice(2)}`, [])
  const widgetRef = useRef<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

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
        defaultLocation: typeof (configJson.from as { city?: unknown } | null)?.city === 'string'
          ? ((configJson.from as { city?: string }).city as string)
          : typeof (configJson.from as { address?: unknown } | null)?.address === 'string'
            ? ((configJson.from as { address?: string }).address as string)
            : 'Москва',
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
          onCalculate({
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
          const t = tariff as { tariff_code: number; delivery_sum: number; period_min: number; period_max: number }
          const a = address as Record<string, unknown>
          const cityCodeRaw = a.city_code ?? a.code
          const cityCode =
            typeof cityCodeRaw === 'number'
              ? cityCodeRaw
              : typeof cityCodeRaw === 'string'
                ? Number.parseInt(cityCodeRaw, 10)
                : undefined
          onChoose({
            deliveryMethod: m,
            tariff: {
              tariffCode: t.tariff_code,
              deliverySum: t.delivery_sum,
              periodMin: t.period_min,
              periodMax: t.period_max,
            },
            cityCode: Number.isFinite(cityCode) && (cityCode as number) > 0 ? (cityCode as number) : undefined,
            city: typeof a.city === 'string' ? a.city : undefined,
            pvzCode: typeof a.code === 'string' ? a.code : undefined,
            pvzAddress: typeof a.address === 'string' ? a.address : undefined,
            doorAddress: typeof a.formatted === 'string' ? a.formatted : undefined,
          })
        },
      })
    }

    run().catch((e) => {
      if (cancelled) return
      setError(e instanceof Error ? e.message : 'CDEK widget error')
    })

    return () => {
      cancelled = true
      widgetRef.current = null
    }
  }, [brandId, items, onCalculate, onChoose, rootId])

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

