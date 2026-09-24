'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CartLine } from '@/store/cart-store'
import type { BrandId } from '@/lib/brand/brand'
import type {
  CdekCityOption,
  CdekPvzOption,
  CdekTariffSummary,
} from '@/components/site/delivery-section'
import {
  buildCityQueryCandidates,
  filterPvzByQuery,
  getPvzDisplayAddress,
} from '@/lib/cdek-manual-search'
import { cn } from '@/lib/utils'
import { logCartDebug } from '@/lib/cart-debug-log'

type ManualDeliveryMethod = 'cdek_pvz' | 'cdek_door'

interface StreetSuggestion {
  street: string
  house: string | null
  text: string
}

interface CdekManualDeliveryProps {
  brandId?: BrandId
  items: CartLine[]
  deliveryMethod: ManualDeliveryMethod
  selectedCity: CdekCityOption | null
  selectedPvz: CdekPvzOption | null
  onCitySelect: (city: CdekCityOption | null) => void
  onPvzChosen: (payload: { city: CdekCityOption; pvz: CdekPvzOption; tariff: CdekTariffSummary }) => void
  onDoorReady: (payload: { city: CdekCityOption; tariff: CdekTariffSummary }) => void
  onStreetChosen: (payload: { street: string; house: string | null; text: string }) => void
  isSprintTheme?: boolean
}

const PVZ_PAGE_SIZE = 50
const PVZ_LIVE_MAX_PAGES = 6
const REQUIRED_TARIFF: Record<ManualDeliveryMethod, number> = { cdek_pvz: 136, cdek_door: 137 }

function brandQuery(brandId?: string, prefix: '&' | '?' = '&'): string {
  return brandId ? `${prefix}brand=${encodeURIComponent(brandId)}` : ''
}

function getCityCode(city: CdekCityOption): number | null {
  const code = city.code ?? city.city_code
  return typeof code === 'number' && Number.isFinite(code) && code > 0 ? code : null
}

/** Простой автокомплит-список подсказок (город / улица). */
function SuggestionList<T>({
  items,
  activeIndex,
  render,
  onPick,
  isSprintTheme,
}: {
  items: T[]
  activeIndex: number
  render: (item: T) => React.ReactNode
  onPick: (item: T) => void
  isSprintTheme: boolean
}) {
  if (items.length === 0) return null
  return (
    <ul
      role="listbox"
      className={cn(
        'absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border shadow-lg',
        isSprintTheme ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-gray-200 bg-white'
      )}
    >
      {items.map((item, idx) => (
        <li key={idx} role="option" aria-selected={idx === activeIndex}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(item)}
            onTouchEnd={(e) => {
              // На тач-устройствах лёгкий сдвиг пальца между touchstart и touchend
              // браузер трактует как скролл/жест и не синтезирует click — обрабатываем
              // выбор явно по touchend и глушим последующий click, чтобы не сработало дважды.
              e.preventDefault()
              onPick(item)
            }}
            className={cn(
              'w-full border-b px-4 py-3 text-left text-sm last:border-0',
              isSprintTheme ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-100 hover:bg-gray-50',
              idx === activeIndex && (isSprintTheme ? 'bg-slate-700' : 'bg-gray-50')
            )}
          >
            {render(item)}
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Ручной выбор доставки СДЭК без карты: город → ПВЗ (поиск по началу адреса) или адрес до двери.
 * Работает только через /api/cdek/* и не зависит от виджета и Yandex Maps JS.
 */
export function CdekManualDelivery({
  brandId,
  items,
  deliveryMethod,
  selectedCity,
  selectedPvz,
  onCitySelect,
  onPvzChosen,
  onDoorReady,
  onStreetChosen,
  isSprintTheme = false,
}: CdekManualDeliveryProps) {
  const [cityQuery, setCityQuery] = useState(selectedCity?.city ?? '')
  const [citySuggestions, setCitySuggestions] = useState<CdekCityOption[]>([])
  const [cityOpen, setCityOpen] = useState(false)
  const [cityActive, setCityActive] = useState(-1)
  const [cityLoading, setCityLoading] = useState(false)
  /** Остаток строки «Москва оре» после названия города — подставляется в поиск ПВЗ/улицы. */
  const pendingRestRef = useRef('')
  const rootRef = useRef<HTMLDivElement>(null)

  const [points, setPoints] = useState<CdekPvzOption[]>([])
  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [pvzQuery, setPvzQuery] = useState('')

  const [tariffLoading, setTariffLoading] = useState(false)
  const [tariffError, setTariffError] = useState<string | null>(null)
  const [tariffAttempt, setTariffAttempt] = useState(0)

  const [streetQuery, setStreetQuery] = useState('')
  const [streetSuggestions, setStreetSuggestions] = useState<StreetSuggestion[]>([])
  const [streetOpen, setStreetOpen] = useState(false)

  const cityCode = selectedCity ? getCityCode(selectedCity) : null

  const inputClass = cn(
    'form-input min-h-[44px] w-full rounded-lg text-base',
    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100'
  )
  const labelClass = cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')
  const mutedClass = isSprintTheme ? 'text-slate-400' : 'text-gray-500'

  // --- Город: автокомплит с разбором «город + начало улицы» ---
  useEffect(() => {
    const trimmed = cityQuery.trim()
    if (!trimmed || (selectedCity && selectedCity.city === trimmed)) {
      setCitySuggestions([])
      setCityLoading(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setCityLoading(true)
      try {
        for (const candidate of buildCityQueryCandidates(trimmed)) {
          const res = await fetch(
            `/api/cdek/cities?q=${encodeURIComponent(candidate.city)}&size=15${brandQuery(brandId)}`,
            { signal: controller.signal }
          )
          const data = (await res.json().catch(() => null)) as { cities?: CdekCityOption[] } | null
          const cities = Array.isArray(data?.cities) ? data.cities : []
          if (cities.length > 0) {
            pendingRestRef.current = candidate.rest
            setCitySuggestions(cities)
            setCityActive(-1)
            setCityOpen(true)
            return
          }
        }
        setCitySuggestions([])
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) setCitySuggestions([])
      } finally {
        if (!controller.signal.aborted) setCityLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [cityQuery, brandId, selectedCity])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setCityOpen(false)
        setStreetOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const pickCity = useCallback(
    (city: CdekCityOption) => {
      onCitySelect(city)
      setCityQuery(city.city ?? '')
      setCitySuggestions([])
      setCityOpen(false)
      const rest = pendingRestRef.current
      pendingRestRef.current = ''
      setPvzQuery(rest)
      setStreetQuery(rest)
      logCartDebug({ scope: 'cart', event: 'manual_city_selected', data: { cityCode: getCityCode(city) } })
    },
    [onCitySelect]
  )

  function handleCityKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!cityOpen || citySuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCityActive((i) => (i + 1) % citySuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCityActive((i) => (i <= 0 ? citySuggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pickCity(citySuggestions[cityActive >= 0 ? cityActive : 0])
    } else if (e.key === 'Escape') {
      setCityOpen(false)
    }
  }

  // --- ПВЗ: сначала весь город из кэша, при промахе — последовательная (без параллели) постраничная загрузка ---
  useEffect(() => {
    setPoints([])
    setPointsError(null)
    if (deliveryMethod !== 'cdek_pvz' || cityCode == null) return
    const controller = new AbortController()
    setPointsLoading(true)

    async function fetchPoints(params: string) {
      const res = await fetch(`/api/cdek/deliverypoints?cityCode=${cityCode}${params}${brandQuery(brandId)}`, {
        signal: controller.signal,
      })
      const data = (await res.json().catch(() => null)) as
        | { deliveryPoints?: CdekPvzOption[]; source?: string; error?: string }
        | null
      if (!res.ok) throw new Error(res.status === 500 ? 'Сервис СДЭК временно недоступен, попробуйте позже' : (data?.error ?? 'Не удалось загрузить пункты выдачи'))
      return { list: Array.isArray(data?.deliveryPoints) ? data.deliveryPoints : [], source: data?.source }
    }

    void (async () => {
      const all: CdekPvzOption[] = []
      try {
        const cached = await fetchPoints(`&all=1&size=${PVZ_PAGE_SIZE}&page=0`)
        if (cached.source === 'cache') {
          setPoints(cached.list)
          return
        }
        all.push(...cached.list)
        setPoints([...all])
        if (cached.list.length < PVZ_PAGE_SIZE) return
        // Живой режим: страницы строго по одной — параллельные всплески СДЭК режет антибот-защитой (403).
        for (let page = 1; page < PVZ_LIVE_MAX_PAGES; page += 1) {
          const { list } = await fetchPoints(`&size=${PVZ_PAGE_SIZE}&page=${page}`)
          all.push(...list)
          setPoints([...all])
          if (list.length < PVZ_PAGE_SIZE) break
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        // Уже загруженные пункты остаются доступными; ошибку показываем только если нет ничего.
        if (all.length === 0) {
          setPointsError(e instanceof Error ? e.message : 'Не удалось загрузить пункты выдачи')
        }
      } finally {
        if (!controller.signal.aborted) setPointsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [deliveryMethod, cityCode, brandId])

  const itemsPayload = useMemo(
    () => items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    [items]
  )

  // --- Тариф: считаем по городу, тот же тариф (136/137), что и в виджете ---
  const [pendingTariff, setPendingTariff] = useState<CdekTariffSummary | null>(null)
  useEffect(() => {
    setPendingTariff(null)
    setTariffError(null)
    if (cityCode == null || itemsPayload.length === 0) return
    const controller = new AbortController()
    setTariffLoading(true)
    void (async () => {
      try {
        const res = await fetch(`/api/cdek/calculator${brandQuery(brandId, '?')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deliveryKind: deliveryMethod === 'cdek_pvz' ? 'pvz' : 'address',
            items: itemsPayload,
            toLocation: { cityCode },
          }),
          signal: controller.signal,
        })
        const json = (await res.json().catch(() => null)) as
          | { tariffs?: CdekTariffSummary[]; error?: string }
          | null
        if (!res.ok) throw new Error(json?.error ?? 'Ошибка расчёта доставки СДЭК')
        const match = (json?.tariffs ?? []).find((t) => t.tariffCode === REQUIRED_TARIFF[deliveryMethod])
        if (!match) {
          throw new Error(
            deliveryMethod === 'cdek_pvz'
              ? 'Доставка в пункт выдачи недоступна для этого города'
              : 'Доставка до двери недоступна для этого города'
          )
        }
        setPendingTariff(match)
        if (deliveryMethod === 'cdek_door' && selectedCity) {
          onDoorReady({ city: selectedCity, tariff: match })
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setTariffError(e instanceof Error ? e.message : 'Ошибка расчёта доставки СДЭК')
      } finally {
        if (!controller.signal.aborted) setTariffLoading(false)
      }
    })()
    return () => controller.abort()
    // onDoorReady/selectedCity намеренно не в зависимостях: пересчёт только при смене города/способа/корзины/повторе.
  }, [cityCode, deliveryMethod, itemsPayload, brandId, tariffAttempt])

  const filteredPoints = useMemo(() => filterPvzByQuery(points, pvzQuery), [points, pvzQuery])

  function choosePvz(pvz: CdekPvzOption) {
    if (!selectedCity || !pendingTariff) return
    onPvzChosen({ city: selectedCity, pvz, tariff: pendingTariff })
  }

  // --- Улица (до двери) ---
  useEffect(() => {
    const q = streetQuery.trim()
    if (deliveryMethod !== 'cdek_door' || !selectedCity?.city || q.length < 2) {
      setStreetSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/cdek/streets?q=${encodeURIComponent(q)}&city=${encodeURIComponent(selectedCity.city ?? '')}${brandQuery(brandId)}`,
          { signal: controller.signal }
        )
        const data = (await res.json().catch(() => null)) as { suggestions?: StreetSuggestion[] } | null
        setStreetSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : [])
        setStreetOpen(true)
      } catch {
        setStreetSuggestions([])
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [streetQuery, deliveryMethod, selectedCity, brandId])

  return (
    <div className="space-y-4" data-testid="cdek-manual-delivery" ref={rootRef}>
      <div className="relative">
        <label htmlFor="cdek-manual-city" className={labelClass}>
          Город
        </label>
        <input
          id="cdek-manual-city"
          type="text"
          autoComplete="off"
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value)
            if (selectedCity) onCitySelect(null)
          }}
          onFocus={() => citySuggestions.length > 0 && setCityOpen(true)}
          onKeyDown={handleCityKeyDown}
          placeholder="Например, Москва или «Москва оре» — сразу с началом улицы"
          className={inputClass}
        />
        {cityLoading ? <p className={cn('mt-1 text-xs', mutedClass)}>Ищем города…</p> : null}
        {cityOpen ? (
          <SuggestionList
            items={citySuggestions}
            activeIndex={cityActive}
            isSprintTheme={isSprintTheme}
            onPick={pickCity}
            render={(c) => (
              <>
                <span className="font-medium">{c.city}</span>
                {c.region ? <span className={mutedClass}>, {c.region}</span> : null}
              </>
            )}
          />
        ) : null}
      </div>

      {deliveryMethod === 'cdek_pvz' ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="cdek-manual-pvz-search" className={labelClass}>
              Пункт выдачи
            </label>
            <input
              id="cdek-manual-pvz-search"
              type="text"
              autoComplete="off"
              disabled={!selectedCity}
              value={pvzQuery}
              onChange={(e) => setPvzQuery(e.target.value)}
              placeholder={selectedCity ? 'Начните вводить улицу или название пункта' : 'Сначала выберите город'}
              className={inputClass}
            />
          </div>
          {selectedCity && pointsLoading ? (
            <p className={cn('text-sm', mutedClass)}>Загружаем пункты выдачи… ({points.length})</p>
          ) : null}
          {pointsError ? <p className="text-sm text-red-600">{pointsError}</p> : null}
          {selectedCity && !pointsLoading && !pointsError && points.length === 0 ? (
            <p className={cn('text-sm', mutedClass)}>В этом городе пункты выдачи не найдены.</p>
          ) : null}
          {tariffError ? (
            <div className="space-y-1">
              <p className="text-sm text-red-600">{tariffError}</p>
              <button
                type="button"
                onClick={() => setTariffAttempt((n) => n + 1)}
                className="text-sm text-action-blue hover:underline"
              >
                Повторить расчёт
              </button>
            </div>
          ) : null}
          {points.length > 0 ? (
            <div
              role="list"
              aria-label="Пункты выдачи СДЭК"
              className={cn(
                'max-h-72 space-y-2 overflow-y-auto rounded-lg border p-1',
                isSprintTheme ? 'border-slate-600' : 'border-gray-200 bg-gray-50/50'
              )}
            >
              {filteredPoints.slice(0, 100).map((pvz) => {
                const active = selectedPvz?.code === pvz.code
                return (
                  <button
                    key={pvz.code ?? pvz.name}
                    type="button"
                    role="listitem"
                    disabled={!pendingTariff}
                    onClick={() => choosePvz(pvz)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left text-sm disabled:opacity-60',
                      active
                        ? 'border-action-blue bg-action-blue/5'
                        : isSprintTheme
                          ? 'border-slate-600 hover:bg-slate-800'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                    )}
                  >
                    <span className="font-medium">{getPvzDisplayAddress(pvz)}</span>
                    {pvz.name && pvz.name !== getPvzDisplayAddress(pvz) ? (
                      <p className={cn('mt-0.5', mutedClass)}>{pvz.name}</p>
                    ) : null}
                    {pvz.work_time ? <p className={cn('mt-1 text-xs', mutedClass)}>{pvz.work_time}</p> : null}
                  </button>
                )
              })}
              {filteredPoints.length === 0 ? (
                <p className={cn('p-3 text-sm', mutedClass)}>По запросу ничего не найдено — измените поиск.</p>
              ) : null}
              {filteredPoints.length > 100 ? (
                <p className={cn('p-2 text-xs', mutedClass)}>
                  Показаны первые 100 из {filteredPoints.length}. Уточните запрос.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <label htmlFor="cdek-manual-street" className={labelClass}>
              Поиск адреса (подсказки)
            </label>
            <input
              id="cdek-manual-street"
              type="text"
              autoComplete="off"
              disabled={!selectedCity}
              value={streetQuery}
              onChange={(e) => setStreetQuery(e.target.value)}
              onFocus={() => streetSuggestions.length > 0 && setStreetOpen(true)}
              placeholder={selectedCity ? 'Начните вводить улицу' : 'Сначала выберите город'}
              className={inputClass}
            />
            {streetOpen ? (
              <SuggestionList
                items={streetSuggestions}
                activeIndex={-1}
                isSprintTheme={isSprintTheme}
                onPick={(s) => {
                  setStreetOpen(false)
                  setStreetQuery(s.text)
                  onStreetChosen(s)
                }}
                render={(s) => <span>{s.text}</span>}
              />
            ) : null}
            <p className={cn('mt-1 text-xs', mutedClass)}>
              Подсказки необязательны: улицу и дом можно ввести вручную в блоке «Адрес доставки» ниже.
            </p>
          </div>
          {tariffError ? (
            <div className="space-y-1">
              <p className="text-sm text-red-600">{tariffError}</p>
              <button
                type="button"
                onClick={() => setTariffAttempt((n) => n + 1)}
                className="text-sm text-action-blue hover:underline"
              >
                Повторить расчёт
              </button>
            </div>
          ) : null}
        </div>
      )}

      {selectedCity && (tariffLoading || pendingTariff) ? (
        <p className={cn('text-sm', isSprintTheme ? 'text-slate-200' : 'text-gray-800')}>
          {tariffLoading
            ? 'Считаем стоимость доставки…'
            : pendingTariff
              ? `Доставка: ${pendingTariff.deliverySum.toLocaleString('ru-RU')} ₽, ${pendingTariff.periodMin}–${pendingTariff.periodMax} дн.`
              : null}
        </p>
      ) : null}
    </div>
  )
}
