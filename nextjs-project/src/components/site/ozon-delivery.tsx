'use client'

import { useEffect, useRef, useState } from 'react'
import type { BrandId } from '@/lib/brand/brand'
import { validatePhoneRu } from '@/lib/phone-mask'
import { cn } from '@/lib/utils'

interface OzonDeliveryPoint {
  id: number
  name: string
  address: string
}

export interface OzonDeliverySelection {
  quoteToken: string
  deliverySum: number
  estimatedDeliveryDays: number
  expiresAt: string
  point: OzonDeliveryPoint
}

interface OzonDeliveryProps {
  phone: string
  items: Array<{ productId: string; quantity: number }>
  brandId?: BrandId
  promoCodeId?: string
  isSprintTheme?: boolean
  onChange: (selection: OzonDeliverySelection | null) => void
}

function withBrand(path: string, brandId?: BrandId): string {
  return brandId ? `${path}${path.includes('?') ? '&' : '?'}brand=${encodeURIComponent(brandId)}` : path
}

export function OzonDelivery({ phone, items, brandId, promoCodeId, isSprintTheme = false, onChange }: OzonDeliveryProps) {
  const [query, setQuery] = useState('')
  const [points, setPoints] = useState<OzonDeliveryPoint[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [point, setPoint] = useState<OzonDeliveryPoint | null>(null)
  const [selection, setSelection] = useState<OzonDeliverySelection | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchController = useRef<AbortController | null>(null)
  const quoteController = useRef<AbortController | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const context = JSON.stringify([brandId, phone, promoCodeId, items.map(({ productId, quantity }) => [productId, quantity])])
  const contextRef = useRef(context)
  contextRef.current = context

  useEffect(() => {
    quoteController.current?.abort()
    setSelection(null)
    setCalculating(false)
    setError(null)
    onChangeRef.current(null)
  }, [context])

  useEffect(() => () => {
    searchController.current?.abort()
    quoteController.current?.abort()
  }, [])

  useEffect(() => {
    if (!selection) return
    const timer = setTimeout(() => {
      setSelection(null)
      onChangeRef.current(null)
      setError('Расчёт доставки устарел. Рассчитайте стоимость ещё раз.')
    }, Math.max(0, Date.parse(selection.expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [selection])

  function clearQuote() {
    quoteController.current?.abort()
    setCalculating(false)
    setSelection(null)
    onChangeRef.current(null)
    setError(null)
  }

  async function searchPoints() {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    searchController.current?.abort()
    const controller = new AbortController()
    searchController.current = controller
    setSearching(true)
    setError(null)
    setSearched(false)
    setPoints([])
    try {
      const response = await fetch(withBrand(`/api/ozon-delivery/points?query=${encodeURIComponent(trimmed)}`, brandId), {
        signal: controller.signal,
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Не удалось загрузить пункты выдачи Ozon')
      if (controller.signal.aborted) return
      setPoints(Array.isArray(payload.points) ? payload.points : [])
      setSearched(true)
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить пункты выдачи Ozon')
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }

  async function calculate() {
    if (!point || !validatePhoneRu(phone).valid) return
    clearQuote()
    const controller = new AbortController()
    quoteController.current = controller
    const requestedContext = context
    setCalculating(true)
    try {
      const response = await fetch(withBrand('/api/ozon-delivery/quote', brandId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, phone, deliveryPointId: point.id, promoCodeId }),
        signal: controller.signal,
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Не удалось рассчитать доставку Ozon')
      if (controller.signal.aborted || contextRef.current !== requestedContext) return
      if (
        typeof payload.quoteToken !== 'string' || !payload.quoteToken ||
        !Number.isFinite(payload.deliverySum) || payload.deliverySum < 0 ||
        !Number.isFinite(payload.estimatedDeliveryDays) || payload.estimatedDeliveryDays < 0 ||
        !Number.isFinite(Date.parse(payload.expiresAt)) || Date.parse(payload.expiresAt) <= Date.now() ||
        payload.point?.id !== point.id || typeof payload.point?.address !== 'string'
      ) throw new Error('Не удалось подтвердить стоимость доставки. Повторите расчёт.')
      setSelection(payload as OzonDeliverySelection)
      onChangeRef.current(payload as OzonDeliverySelection)
    } catch (cause) {
      if (controller.signal.aborted || contextRef.current !== requestedContext) return
      setError(cause instanceof Error ? cause.message : 'Не удалось рассчитать доставку Ozon')
    } finally {
      if (!controller.signal.aborted && contextRef.current === requestedContext) setCalculating(false)
    }
  }

  const phoneValid = validatePhoneRu(phone).valid
  const buttonClass = cn('min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50',
    isSprintTheme ? 'bg-[#7AA2FF] text-slate-950' : 'bg-action-blue text-gray-800')

  return (
    <section aria-label="Доставка Ozon в пункт выдачи" className={cn('space-y-4 rounded-2xl border p-6',
      isSprintTheme ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-gray-200 bg-white')}>
      <h2 className="text-lg font-semibold">Доставка Ozon в пункт выдачи</h2>
      <div>
        <label htmlFor="ozon-point-query" className="mb-1 block text-sm font-medium">Город или адрес пункта выдачи</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="ozon-point-query"
            value={query}
            maxLength={100}
            placeholder="Например: Москва, Тверская"
            onChange={(event) => {
              searchController.current?.abort()
              setSearching(false)
              setQuery(event.target.value)
              setPoints([])
              setSearched(false)
              setPoint(null)
              clearQuote()
            }}
            className={cn('form-input min-h-[44px] min-w-0 flex-1 rounded-lg text-base',
              isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100')}
          />
          <button type="button" className={buttonClass} disabled={query.trim().length < 2 || searching} onClick={() => void searchPoints()}>
            {searching ? 'Поиск...' : 'Найти пункты'}
          </button>
        </div>
      </div>
      {searching ? <p role="status" className="text-sm">Загружаем пункты выдачи Ozon...</p> : null}
      {searched && points.length === 0 ? <p role="status" className="text-sm">Пункты выдачи не найдены. Уточните город или адрес.</p> : null}
      {points.length > 0 ? (
        <ul aria-label="Пункты выдачи Ozon" className="max-h-80 space-y-2 overflow-y-auto">
          {points.map((option) => (
            <li key={option.id}>
              <button type="button" aria-pressed={point?.id === option.id} onClick={() => { clearQuote(); setPoint(option) }}
                className={cn('min-h-[44px] w-full rounded-lg border p-3 text-left text-sm',
                  point?.id === option.id ? 'border-action-blue bg-action-blue/10' : isSprintTheme ? 'border-slate-600' : 'border-gray-200')}>
                <span className="block font-medium">{option.name}</span>
                <span className="mt-1 block">{option.address}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {point ? (
        <div className="space-y-3">
          <p className="text-sm">Выбран пункт выдачи: {point.address}</p>
          {!phoneValid ? <p className="text-sm">Укажите корректный телефон в контактных данных ниже, чтобы рассчитать доставку.</p> : null}
          <button type="button" className={buttonClass} disabled={!phoneValid || calculating} onClick={() => void calculate()}>
            {calculating ? 'Расчёт...' : 'Рассчитать доставку Ozon'}
          </button>
        </div>
      ) : null}
      {selection ? <p role="status" className="text-sm">Доставка: {selection.deliverySum.toLocaleString('ru-RU')} ₽. Срок: {selection.estimatedDeliveryDays} дн.</p> : null}
      {error ? <p role="alert" className={cn('text-sm', isSprintTheme ? 'text-red-300' : 'text-red-600')}>{error}</p> : null}
    </section>
  )
}
