'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrandId } from '@/lib/brand/brand'
import {
  buildCdekWidgetItemsSignature,
  buildCdekWidgetProductSetSignature,
  getCdekWidgetCartLines,
} from '@/lib/cdek-widget-items'
import { logCartDebug } from '@/lib/cart-debug-log'
import {
  getCachedCdekWidgetConfig,
  loadCdekWidgetScriptOnce,
  preloadCdekYandexMapsV3,
  type CdekWidgetConfigResponse,
} from '@/lib/cdek-widget-preload'
import { detectCdekWidgetModeFromText } from '@/lib/cdek-widget-mode'
import type { CartLine } from '@/store/cart-store'

declare global {
  interface Window {
    CDEKWidget?: new (params: Record<string, unknown>) => CdekWidgetInstance
  }
}

interface CdekWidgetInstance {
  addParcel?: (parcel: unknown) => void
  resetParcels?: () => void
  open?: () => void
  close?: () => void
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

type WidgetConfigResponse = CdekWidgetConfigResponse

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
const WIDGET_INIT_TIMEOUT_MS = 45_000

const CDEK_WIDGET_MOBILE_BREAKPOINT_PX = 555

function isCdekWidgetDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CART_DEBUG === 'true' || process.env.NODE_ENV === 'development'
}

interface CdekWidgetDebugEvent {
  at: string
  event: string
  data?: Record<string, unknown>
}

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

export { warmupCdekWidget, preloadCdekWidgetScript } from '@/lib/cdek-widget-preload'

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
  const widgetRef = useRef<CdekWidgetInstance | null>(null)
  const onChooseRef = useRef<CdekWidgetProps['onChoose']>(onChoose)
  const onCalculateRef = useRef<CdekWidgetProps['onCalculate']>(onCalculate)
  const onModeChangeRef = useRef<CdekWidgetProps['onModeChange']>(onModeChange)
  const itemsRef = useRef(items)
  const initGenerationRef = useRef(0)
  const lastSyncedItemsSignatureRef = useRef('')
  const lastKnownModeRef = useRef<'cdek_pvz' | 'cdek_door' | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [debugEvents, setDebugEvents] = useState<CdekWidgetDebugEvent[]>([])
  const [debugMode, setDebugMode] = useState<'cdek_pvz' | 'cdek_door' | null>(null)
  const itemsSignature = useMemo(() => buildCdekWidgetItemsSignature(items), [items])
  const productSetSignature = useMemo(() => buildCdekWidgetProductSetSignature(items), [items])

  const pushDebugEvent = (event: string, data?: Record<string, unknown>) => {
    if (!isCdekWidgetDebugEnabled()) return
    setDebugEvents((prev) => [
      ...prev.slice(-11),
      { at: new Date().toISOString(), event, data },
    ])
  }

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
    lastSyncedItemsSignatureRef.current = ''
    const initGeneration = ++initGenerationRef.current
    const initStartedAt = typeof performance !== 'undefined' ? performance.now() : 0

    async function run() {
      setError(null)
      setIsReady(false)
      widgetReady = false
      const widgetItems = getCdekWidgetCartLines(itemsRef.current)

      pushDebugEvent('init_start', {
        initGeneration,
        brandId: brandId ?? null,
        itemsSignature,
        productSetSignature,
        rootId,
      })
      logCartDebug({
        scope: 'cdek-widget',
        event: 'init_start',
        data: {
          initGeneration,
          brandId: brandId ?? null,
          itemsCount: widgetItems.length,
          itemsSignature,
          productSetSignature,
          defaultLocation: defaultLocation ?? null,
          selectedOffice: selected?.office ?? null,
          selectedDoor: selected?.door ?? null,
          rootId,
        },
      })

      let configJson: WidgetConfigResponse
      try {
        ;[configJson] = await Promise.all([
          getCachedCdekWidgetConfig({ brandId, items: itemsRef.current }),
          loadCdekWidgetScriptOnce(),
          preloadCdekYandexMapsV3(),
        ])
        if (initStartedAt > 0) {
          pushDebugEvent('assets_ready', {
            initGeneration,
            ms: Math.round(performance.now() - initStartedAt),
          })
        }
      } catch (configError) {
        const message =
          configError instanceof Error ? configError.message : 'Failed to load CDEK widget config'
        logCartDebug({
          scope: 'cdek-widget',
          event: 'config_failed',
          level: 'error',
          data: {
            initGeneration,
            brandId: brandId ?? null,
            message,
            itemsCount: widgetItems.length,
          },
        })
        throw configError
      }
      if (cancelled) return

      logCartDebug({
        scope: 'cdek-widget',
        event: 'config_loaded',
        data: {
          initGeneration,
          brandId: brandId ?? null,
          goodsCount: configJson.goods?.length ?? 0,
          officeTariffs: configJson.tariffs?.office ?? [],
          doorTariffs: configJson.tariffs?.door ?? [],
          from: configJson.from ?? null,
        },
      })

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
            initGeneration,
            timeoutMs: WIDGET_INIT_TIMEOUT_MS,
            brandId: brandId ?? null,
            rootId,
          },
        })
        pushDebugEvent('init_timeout', { initGeneration, rootId })
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
        debug: isCdekWidgetDebugEnabled(),
        fixBounds: 'country',
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
            data: { initGeneration, brandId: brandId ?? null, rootId },
          })
          pushDebugEvent('ready', {
            initGeneration,
            rootId,
            ms: initStartedAt > 0 ? Math.round(performance.now() - initStartedAt) : null,
          })
          lastSyncedItemsSignatureRef.current = itemsSignature
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
          setDebugMode(m)
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
        setDebugMode(mode)
        onModeChangeRef.current?.(mode)
      }

      const detectModeFromEvent = (event: Event): 'cdek_pvz' | 'cdek_door' | null => {
        const target = event.target
        if (!(target instanceof HTMLElement) || !rootEl.contains(target)) return null

        let element: HTMLElement | null = target
        for (let depth = 0; depth < 4 && element && rootEl.contains(element); depth += 1) {
          const label = (element.innerText ?? '').trim()
          if (label.length > 0 && label.length <= 80) {
            const mode = detectCdekWidgetModeFromText(label)
            if (mode) return mode
          }
          element = element.parentElement
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
          initGeneration,
          brandId: brandId ?? null,
          message,
          rootId,
        },
      })
      pushDebugEvent('init_failed', { initGeneration, message, rootId })
      setError(message)
    })

    return () => {
      cancelled = true
      pushDebugEvent('cleanup', { initGeneration, rootId })
      logCartDebug({
        scope: 'cdek-widget',
        event: 'cleanup',
        data: { initGeneration, rootId, widgetReady },
      })
      if (initTimeoutId != null) clearTimeout(initTimeoutId)
      removeMobileLayoutSync?.()
      removeRootInteractionListeners?.()
      widgetRef.current = null
      const rootEl = document.getElementById(rootId)
      if (rootEl) rootEl.innerHTML = ''
    }
  }, [brandId, productSetSignature, defaultLocation, selected?.door, selected?.office, rootId])

  useEffect(() => {
    if (!isReady) return
    if (lastSyncedItemsSignatureRef.current === itemsSignature) return

    const widget = widgetRef.current
    if (!widget?.resetParcels || !widget.addParcel) return

    let cancelled = false

    async function syncParcels() {
      try {
        const configJson = await getCachedCdekWidgetConfig({ brandId, items: itemsRef.current })
        if (cancelled) return

        widget.resetParcels?.()
        for (const good of configJson.goods ?? []) {
          widget.addParcel?.(good)
        }

        logCartDebug({
          scope: 'cdek-widget',
          event: 'parcels_synced',
          data: {
            itemsSignature,
            goodsCount: configJson.goods?.length ?? 0,
          },
        })
        pushDebugEvent('parcels_synced', {
          itemsSignature,
          goodsCount: configJson.goods?.length ?? 0,
        })
        lastSyncedItemsSignatureRef.current = itemsSignature
      } catch (syncError) {
        if (cancelled) return
        const message = syncError instanceof Error ? syncError.message : 'parcel sync failed'
        logCartDebug({
          scope: 'cdek-widget',
          event: 'parcels_sync_failed',
          level: 'warn',
          error: syncError,
          data: { itemsSignature, message },
        })
        pushDebugEvent('parcels_sync_failed', { itemsSignature, message })
      }
    }

    void syncParcels()

    return () => {
      cancelled = true
    }
  }, [brandId, isReady, itemsSignature])

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
            </p>
          </div>
        ) : null}
        <div id={rootId} style={{ width: '100%', height: '100%' }} />
      </div>
      {isCdekWidgetDebugEnabled() ? (
        <details className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <summary className="cursor-pointer font-medium">CDEK debug</summary>
          <dl className="mt-2 grid gap-1 sm:grid-cols-2">
            <div>
              <dt className="font-medium">ready</dt>
              <dd>{isReady ? 'yes' : 'no'}</dd>
            </div>
            <div>
              <dt className="font-medium">mode</dt>
              <dd>{debugMode ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-medium">root</dt>
              <dd className="break-all">{rootId}</dd>
            </div>
            <div>
              <dt className="font-medium">items</dt>
              <dd className="break-all">{itemsSignature || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium">products</dt>
              <dd className="break-all">{productSetSignature || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium">error</dt>
              <dd className="break-all">{error ?? '—'}</dd>
            </div>
          </dl>
          {debugEvents.length > 0 ? (
            <ol className="mt-2 max-h-40 space-y-1 overflow-auto font-mono text-[11px]">
              {debugEvents.map((entry) => (
                <li key={`${entry.at}-${entry.event}`}>
                  {entry.at.slice(11, 19)} {entry.event}
                  {entry.data ? ` ${JSON.stringify(entry.data)}` : ''}
                </li>
              ))}
            </ol>
          ) : null}
        </details>
      ) : null}
    </div>
  )
}
