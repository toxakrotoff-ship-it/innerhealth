'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrandId } from '@/lib/brand/brand'
import {
  buildCdekWidgetItemsSignature,
  getCdekWidgetCartLines,
} from '@/lib/cdek-widget-items'
import { logCartDebug } from '@/lib/cart-debug-log'
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
    cityUuid?: string
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
const WIDGET_INIT_TIMEOUT_MS = 45_000

const CDEK_WIDGET_MOBILE_BREAKPOINT_PX = 555

function applyCdekWidgetMobileLayout(hostEl: HTMLElement): () => void {
  const widgetAppRoot = hostEl.querySelector<HTMLElement>('[class*="cdek-jipbqv"]')
  if (!widgetAppRoot) return () => undefined

  const syncMobileLayout = (width: number) => {
    const isMobile = width > 0 && width < CDEK_WIDGET_MOBILE_BREAKPOINT_PX
    widgetAppRoot.classList.toggle('mobile', isMobile)
    hostEl.classList.toggle('cdek-widget-host--mobile', isMobile)
  }

  const observer = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0
    syncMobileLayout(width)
  })

  observer.observe(hostEl)
  syncMobileLayout(hostEl.getBoundingClientRect().width)

  return () => {
    observer.disconnect()
    widgetAppRoot.classList.remove('mobile')
    hostEl.classList.remove('cdek-widget-host--mobile')
  }
}

function finishCdekScriptLoad(resolve: () => void, reject: (error: Error) => void): void {
  if (window.CDEKWidget) {
    resolve()
    return
  }
  reject(new Error('CDEKWidget is not available after script load'))
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.CDEKWidget) {
      resolve()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        finishCdekScriptLoad(resolve, reject)
        return
      }
      existing.addEventListener(
        'load',
        () => {
          finishCdekScriptLoad(resolve, reject)
        },
        { once: true }
      )
      existing.addEventListener('error', () => reject(new Error('Failed to load script')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      finishCdekScriptLoad(resolve, reject)
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

/** Warm up the UMD bundle before the user opens the widget (e.g. on cart page mount). */
export function preloadCdekWidgetScript(): void {
  void loadScriptOnce(WIDGET_UMD_SRC).catch(() => {})
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
  const itemsRef = useRef(items)
  const lastKnownModeRef = useRef<'cdek_pvz' | 'cdek_door' | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const itemsSignature = useMemo(() => buildCdekWidgetItemsSignature(items), [items])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    onChooseRef.current = onChoose
    onCalculateRef.current = onCalculate
    onModeChangeRef.current = onModeChange
  }, [onChoose, onCalculate, onModeChange])

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      // bfcache restore: scripts might be present, but widget internal state can be broken.
      if (event.persisted) {
        setInstanceKey(Math.random().toString(16).slice(2))
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let removeRootInteractionListeners: (() => void) | null = null
    let removeMobileLayoutSync: (() => void) | null = null
    let initTimeoutId: ReturnType<typeof setTimeout> | null = null
    let widgetReady = false

    async function run() {
      setError(null)
      setIsReady(false)
      widgetReady = false
      const brandQuery = brandId ? `?brand=${encodeURIComponent(brandId)}` : ''
      const widgetItems = getCdekWidgetCartLines(itemsRef.current)

      logCartDebug({
        scope: 'cdek-widget',
        event: 'init_start',
        data: {
          brandId: brandId ?? null,
          itemsCount: widgetItems.length,
          itemsSignature,
          defaultLocation: defaultLocation ?? null,
          selectedOffice: selected?.office ?? null,
          selectedDoor: selected?.door ?? null,
          rootId,
        },
      })

      const configRes = await fetch(`/api/cdek-widget/config${brandQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: widgetItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        }),
      })
      const configJson = (await configRes.json()) as Partial<WidgetConfigResponse> & { error?: string }
      if (!configRes.ok) {
        logCartDebug({
          scope: 'cdek-widget',
          event: 'config_failed',
          level: 'error',
          data: {
            brandId: brandId ?? null,
            status: configRes.status,
            error: configJson.error ?? null,
            itemsCount: widgetItems.length,
          },
        })
        throw new Error(configJson.error ?? 'Failed to load CDEK widget config')
      }

      logCartDebug({
        scope: 'cdek-widget',
        event: 'config_loaded',
        data: {
          brandId: brandId ?? null,
          goodsCount: configJson.goods?.length ?? 0,
          officeTariffs: configJson.tariffs?.office ?? [],
          doorTariffs: configJson.tariffs?.door ?? [],
          from: configJson.from ?? null,
        },
      })

      await loadScriptOnce(WIDGET_UMD_SRC)
      if (cancelled) return

      if (!window.CDEKWidget) {
        logCartDebug({
          scope: 'cdek-widget',
          event: 'script_loaded_without_global',
          level: 'error',
        })
        throw new Error('CDEKWidget is not available on window')
      }
      const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        logCartDebug({
          scope: 'cdek-widget',
          event: 'missing_yandex_maps_key',
          level: 'error',
        })
        throw new Error('Yandex Maps apiKey is missing (NEXT_PUBLIC_YANDEX_MAPS_API_KEY)')
      }

      initTimeoutId = setTimeout(() => {
        if (cancelled || widgetReady) return
        logCartDebug({
          scope: 'cdek-widget',
          event: 'init_timeout',
          level: 'error',
          data: {
            timeoutMs: WIDGET_INIT_TIMEOUT_MS,
            brandId: brandId ?? null,
            rootId,
          },
        })
        setError('Виджет СДЭК не ответил вовремя. Проверьте интернет и попробуйте ещё раз.')
      }, WIDGET_INIT_TIMEOUT_MS)

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
          if (cancelled) return
          widgetReady = true
          if (initTimeoutId != null) {
            clearTimeout(initTimeoutId)
            initTimeoutId = null
          }
          logCartDebug({
            scope: 'cdek-widget',
            event: 'ready',
            data: { brandId: brandId ?? null, rootId },
          })
          setIsReady(true)
          const hostEl = hostRef.current
          if (!hostEl) return
          requestAnimationFrame(() => {
            if (cancelled) return
            removeMobileLayoutSync?.()
            removeMobileLayoutSync = applyCdekWidgetMobileLayout(hostEl)
          })
        },
        onCalculate(tariffs: unknown) {
          const t = tariffs as {
            office?: Array<{ tariff_code: number; delivery_sum: number; period_min: number; period_max: number }>
            door?: Array<{ tariff_code: number; delivery_sum: number; period_min: number; period_max: number }>
          }
          logCartDebug({
            scope: 'cdek-widget',
            event: 'calculate',
            data: {
              officeCount: t.office?.length ?? 0,
              doorCount: t.door?.length ?? 0,
              office: (t.office ?? []).map((x) => ({
                tariffCode: x.tariff_code,
                deliverySum: x.delivery_sum,
              })),
              door: (t.door ?? []).map((x) => ({
                tariffCode: x.tariff_code,
                deliverySum: x.delivery_sum,
              })),
            },
          })
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
          logCartDebug({
            scope: 'cdek-widget',
            event: 'choose',
            data: {
              mode: m,
              tariff: {
                tariffCode: t.tariff_code ?? t.tariffCode ?? t.code ?? null,
                deliverySum: t.delivery_sum ?? t.deliverySum ?? t.price ?? t.cost ?? null,
              },
              address: {
                cityCode: a.city_code ?? a.code ?? null,
                cityUuid: a.city_uuid ?? null,
                city: a.city ?? null,
                pvzCode: a.code ?? null,
                pvzAddress: a.address ?? null,
                doorAddress: a.formatted ?? null,
              },
            },
          })
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
            cityUuid:
              typeof a.city_uuid === 'string' && a.city_uuid.trim().length > 0
                ? a.city_uuid.trim()
                : undefined,
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
      const message = e instanceof Error ? e.message : 'CDEK widget error'
      logCartDebug({
        scope: 'cdek-widget',
        event: 'init_failed',
        level: 'error',
        error: e,
        data: {
          brandId: brandId ?? null,
          message,
          rootId,
        },
      })
      setError(message)
    })

    return () => {
      cancelled = true
      if (initTimeoutId != null) clearTimeout(initTimeoutId)
      removeMobileLayoutSync?.()
      removeRootInteractionListeners?.()
      widgetRef.current = null
      const rootEl = document.getElementById(rootId)
      if (rootEl) rootEl.innerHTML = ''
    }
  }, [brandId, itemsSignature, defaultLocation, selected?.door, selected?.office, rootId])

  function handleRetry() {
    logCartDebug({
      scope: 'cdek-widget',
      event: 'retry',
      level: 'warn',
      data: { previousError: error },
    })
    setError(null)
    setIsReady(false)
    setInstanceKey(Math.random().toString(16).slice(2))
  }

  return (
    <div
      ref={hostRef}
      className="cdek-widget-host min-w-0 max-w-full space-y-3 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 md:p-6"
    >
      <div className="text-lg font-semibold">Доставка (СДЭК)</div>
      {error ? (
        <div className="space-y-2">
          <div className="text-sm text-red-600">{error}</div>
          <button
            type="button"
            onClick={handleRetry}
            className="min-h-[44px] rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Повторить загрузку
          </button>
        </div>
      ) : null}
      <div className="cdek-widget-viewport relative h-[min(520px,calc(100dvh-12rem))] w-full min-w-0 max-w-full overflow-hidden rounded-xl sm:h-[580px] md:h-[650px]">
        {!error && !isReady ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 px-4 text-center">
            <p className="text-sm text-gray-600">
              Загружаем карту и пункты выдачи СДЭК…
              <span className="mt-1 block text-xs text-gray-500">Первый запуск может занять до минуты</span>
            </p>
          </div>
        ) : null}
        <div id={rootId} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
