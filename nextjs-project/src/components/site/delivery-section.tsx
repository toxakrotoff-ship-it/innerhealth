'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

const YandexMapPvz = dynamic(
  () => import('./yandex-map-pvz').then((m) => ({ default: m.YandexMapPvz })),
  { ssr: false }
)

/** Прокручивает элемент в область видимости */
function scrollIntoViewSmooth(el: HTMLElement | null) {
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
}

export interface CdekCityOption {
  code: number
  city?: string
  region?: string
  country?: string
  /** На случай, если API вернёт city_code вместо code */
  city_code?: number
}

export interface CdekTariffSummary {
  deliverySum: number
  periodMin: number
  periodMax: number
  /** Код тарифа СДЭК (136, 139, 234 и т.д.) для создания заказа */
  tariffCode?: number
}

export interface CdekPvzOption {
  code?: string
  name?: string
  address?: string
  full_address?: string
  work_time?: string
  phones?: Array<{ number?: string }>
  location?: { latitude?: number; longitude?: number }
}

export type DeliveryMethod = 'cdek_pvz' | 'cdek_door' | 'pickup'

interface DeliverySectionProps {
  /** Выбранный город (для отображения и расчёта) */
  selectedCity: CdekCityOption | null
  onCitySelect: (city: CdekCityOption | null) => void
  /** Тариф для «До ПВЗ» (после расчёта) */
  pvzTariff: CdekTariffSummary | null
  /** Тариф для «До двери» */
  doorTariff: CdekTariffSummary | null
  /** Загрузка расчёта */
  calculationLoading: boolean
  /** Запуск расчёта по выбранному городу */
  onCalculate: () => void
  /** Текущий способ доставки */
  deliveryMethod: DeliveryMethod
  onDeliveryMethodChange: (method: DeliveryMethod) => void
  /** Список ПВЗ (после загрузки по cityCode) */
  deliveryPoints: CdekPvzOption[]
  deliveryPointsLoading: boolean
  /** Ошибка загрузки списка ПВЗ (если запрос вернул ошибку) */
  deliveryPointsError?: string | null
  /** Выбранный ПВЗ */
  selectedPvz: CdekPvzOption | null
  onPvzSelect: (pvz: CdekPvzOption | null) => void
  /** Получатель (ФИО) */
  recipientName: string
  onRecipientNameChange: (value: string) => void
  /** Адрес для «До двери» */
  doorAddress: {
    street: string
    house: string
    apartment: string
    entrance: string
    floor: string
    intercom: string
  }
  onDoorAddressChange: (address: Partial<DeliverySectionProps['doorAddress']>) => void
  /** Комментарий к заказу */
  comment: string
  onCommentChange: (value: string) => void
  /** Ошибка (калькулятор или ПВЗ) */
  error: string | null
  isSprintTheme?: boolean
}

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

export function DeliverySection({
  selectedCity,
  onCitySelect,
  pvzTariff,
  doorTariff,
  calculationLoading,
  onCalculate,
  deliveryMethod,
  onDeliveryMethodChange,
  deliveryPoints,
  deliveryPointsLoading,
  deliveryPointsError,
  selectedPvz,
  onPvzSelect,
  recipientName,
  onRecipientNameChange,
  doorAddress,
  onDoorAddressChange,
  comment,
  onCommentChange,
  error,
  isSprintTheme = false,
}: DeliverySectionProps) {
  const [cityQuery, setCityQuery] = useState(selectedCity?.city ?? '')
  const [citySuggestions, setCitySuggestions] = useState<CdekCityOption[]>([])
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false)
  const [citySearchLoading, setCitySearchLoading] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cityWrapRef = useRef<HTMLDivElement>(null)
  const pvzListWrapRef = useRef<HTMLDivElement>(null)
  /** Поиск по пунктам выдачи (фильтр списка ПВЗ) */
  const [pvzSearchQuery, setPvzSearchQuery] = useState('')

  const fetchCities = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCitySuggestions([])
      return
    }
    setCitySearchLoading(true)
    try {
      const res = await fetch(`/api/cdek/cities?q=${encodeURIComponent(q.trim())}&size=15`)
      const data = await res.json()
      setCitySuggestions(Array.isArray(data.cities) ? data.cities : [])
      setCitySuggestionsOpen(true)
    } catch {
      setCitySuggestions([])
    } finally {
      setCitySearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedCity) {
      setCityQuery(selectedCity.city ?? '')
    }
  }, [selectedCity])

  useEffect(() => {
    if (!selectedCity) setPvzSearchQuery('')
  }, [selectedCity])

  useEffect(() => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    if (!cityQuery.trim()) {
      setCitySuggestions([])
      setCitySuggestionsOpen(false)
      return
    }
    cityDebounceRef.current = setTimeout(() => fetchCities(cityQuery), 300)
    return () => {
      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    }
  }, [cityQuery, fetchCities])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target as Node)) {
        setCitySuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /** Прокрутка списка ПВЗ к выбранному пункту при выборе на карте или в списке */
  useEffect(() => {
    if (!selectedPvz?.code || !pvzListWrapRef.current) return
    const el = pvzListWrapRef.current.querySelector<HTMLElement>(
      `[data-pvz-code="${CSS.escape(selectedPvz.code)}"]`
    )
    scrollIntoViewSmooth(el)
  }, [selectedPvz?.code])

  const cityLabel = selectedCity
    ? `Россия, г ${selectedCity.city ?? ''}${selectedCity.region ? `, ${selectedCity.region}` : ''}`
    : null

  /** Отображаемое значение поля «Пункт получения»: выбранный адрес или введённый поиск */
  const pvzInputValue = selectedPvz
    ? (selectedPvz.full_address || selectedPvz.address || selectedPvz.name || '')
    : pvzSearchQuery

  /** Список ПВЗ, отфильтрованный по поиску */
  const filteredDeliveryPoints =
    !pvzSearchQuery.trim()
      ? deliveryPoints
      : deliveryPoints.filter((p) => {
          const q = pvzSearchQuery.trim().toLowerCase()
          const name = (p.name ?? '').toLowerCase()
          const addr = (p.address ?? '').toLowerCase()
          const full = (p.full_address ?? '').toLowerCase()
          return name.includes(q) || addr.includes(q) || full.includes(q)
        })

  return (
    <div
      className={cn(
        'rounded-2xl border p-6 space-y-6',
        isSprintTheme ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-gray-200 bg-white'
      )}
    >
      <h2 className={cn('text-lg font-semibold', isSprintTheme ? 'text-slate-100' : 'text-text')}>Доставка</h2>

      {/* Способ доставки */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Способ доставки</p>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="delivery-method"
              checked={deliveryMethod === 'cdek_pvz'}
              onChange={() => onDeliveryMethodChange('cdek_pvz')}
              className="rounded-full"
            />
            <span className="flex-1 text-sm">
              Доставка СДЭК до пункта самовывоза
              {pvzTariff && (
                <span className="text-gray-500 ml-1">
                  от {pvzTariff.periodMin} дн., от {pvzTariff.deliverySum.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="delivery-method"
              checked={deliveryMethod === 'cdek_door'}
              onChange={() => onDeliveryMethodChange('cdek_door')}
              className="rounded-full"
            />
            <span className="flex-1 text-sm">
              Доставка СДЭК до двери
              {doorTariff && (
                <span className="text-gray-500 ml-1">
                  от {doorTariff.periodMin} дн., от {doorTariff.deliverySum.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="delivery-method"
              checked={deliveryMethod === 'pickup'}
              onChange={() => onDeliveryMethodChange('pickup')}
              className="rounded-full"
            />
            <span className="flex-1 text-sm">Самовывоз от 1 дня</span>
          </label>
        </div>
        {selectedCity && (
          <button
            type="button"
            onClick={onCalculate}
            disabled={calculationLoading}
            className="mt-2 text-sm text-action-blue hover:underline disabled:opacity-50"
          >
            {calculationLoading ? 'Расчёт...' : 'Рассчитать стоимость доставки'}
          </button>
        )}
      </div>

      {/* Город — под кнопкой «Рассчитать доставку» */}
      <div ref={cityWrapRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
        <div className="relative">
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value)
              if (!e.target.value) onCitySelect(null)
            }}
            onFocus={() => citySuggestions.length > 0 && setCitySuggestionsOpen(true)}
            onBlur={() => {
              const q = cityQuery.trim().toLowerCase()
              if (!q || citySuggestions.length === 0) return
              const match = citySuggestions.find(
                (c) => (c.city ?? '').trim().toLowerCase() === q
              )
              if (match) {
                onCitySelect(match)
                setCityQuery(match.city ?? '')
                setCitySuggestionsOpen(false)
              }
            }}
            placeholder="Например, Москва"
            className="form-input w-full rounded-lg text-base min-h-[44px] pl-4 pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </span>
        </div>
        {cityLabel && (
          <p className="mt-1 text-sm text-gray-500">{cityLabel}</p>
        )}
        {citySuggestionsOpen && citySuggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {citySuggestions.map((c, idx) => (
              <li key={c.code ?? (c as { city_code?: number }).city_code ?? idx}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  onClick={() => {
                    onCitySelect(c)
                    setCitySuggestionsOpen(false)
                    setCityQuery(c.city ?? '')
                    setCitySuggestions([])
                  }}
                >
                  <span className="font-medium">{c.city}</span>
                  {c.region && <span className="text-gray-500">, {c.region}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {citySearchLoading && (
          <p className="mt-1 text-sm text-gray-400">Поиск городов...</p>
        )}
      </div>

      {/* Пункт получения и карта ПВЗ — показываем сразу при выборе «До ПВЗ» */}
      {deliveryMethod === 'cdek_pvz' && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Пункт получения</label>
          <div className="relative">
            <input
              type="text"
              value={pvzInputValue}
              onChange={(e) => {
                setPvzSearchQuery(e.target.value)
                if (selectedPvz) onPvzSelect(null)
              }}
              placeholder={
                selectedCity
                  ? 'Введите адрес или название — или выберите пункт на карте / в списке ниже'
                  : 'Сначала выберите город выше'
              }
              className="form-input w-full rounded-lg text-base min-h-[44px] pr-10"
              onClick={() => setCitySuggestionsOpen(false)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </span>
          </div>

          <div>
            {selectedCity && (
              <p className="text-sm text-gray-600 mb-2">
                Город: <strong>{selectedCity.city}</strong>
                {selectedCity.region && `, ${selectedCity.region}`}
                {deliveryPointsLoading && ' — загрузка пунктов...'}
              </p>
            )}
            {!selectedCity && (
              <p className="text-sm text-gray-500 mb-2">
                Выберите город в поле «Город» выше — на карту подставятся метки пунктов выдачи.
              </p>
            )}
            <p className="text-sm font-medium text-gray-700 mb-2">Карта пунктов выдачи</p>
            <div className="h-[320px] rounded-xl overflow-hidden border border-gray-200">
              <YandexMapPvz
                points={deliveryPoints.filter((p) => p.location?.latitude != null && p.location?.longitude != null)}
                selectedCode={selectedPvz?.code}
                onSelect={(code) => {
                  const p = deliveryPoints.find((dp) => dp.code === code)
                  if (p) onPvzSelect(p)
                }}
              />
            </div>
            {selectedCity && !deliveryPointsLoading && deliveryPointsError && (
              <p className="text-sm text-red-600 mt-2">{deliveryPointsError}</p>
            )}
            {selectedCity && !deliveryPointsLoading && !deliveryPointsError && deliveryPoints.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">По выбранному городу пункты выдачи не найдены.</p>
            )}
          </div>

          {selectedCity && deliveryPoints.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Список пунктов выдачи</p>
              <div
                ref={pvzListWrapRef}
                className="pvz-list-scroll space-y-2 max-h-48 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 bg-gray-50/50 pr-1"
                role="list"
                aria-label="Список пунктов выдачи, прокручивается"
              >
                {filteredDeliveryPoints.map((pvz) => (
                  <button
                    key={pvz.code ?? pvz.name}
                    type="button"
                    data-pvz-code={pvz.code ?? undefined}
                    onClick={() => onPvzSelect(pvz)}
                    className={`w-full text-left p-3 rounded-lg border text-sm ${
                      selectedPvz?.code === pvz.code
                        ? 'border-action-blue bg-action-blue/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{pvz.name ?? pvz.code}</span>
                    {(pvz.address || pvz.full_address) && (
                      <p className="text-gray-600 mt-0.5">{pvz.full_address || pvz.address}</p>
                    )}
                    {pvz.work_time && (
                      <p className="text-gray-500 text-xs mt-1">{pvz.work_time}</p>
                    )}
                  </button>
                ))}
              </div>
              {filteredDeliveryPoints.length > 3 && (
                <p className="text-xs text-gray-500 mt-1.5">Прокрутите список вниз, чтобы увидеть все пункты</p>
              )}
              {filteredDeliveryPoints.length === 0 && pvzSearchQuery.trim() && (
                <p className="text-sm text-gray-500 mt-2">По запросу ничего не найдено. Измените поиск или выберите пункт на карте.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Адрес до двери */}
      {deliveryMethod === 'cdek_door' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Улица</label>
            <div className="relative">
              <input
                type="text"
                value={doorAddress.street}
                onChange={(e) => onDoorAddressChange({ street: e.target.value })}
                placeholder="Улица"
                className="form-input w-full rounded-lg text-base min-h-[44px] pl-4 pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дом</label>
            <input
              type="text"
              value={doorAddress.house}
              onChange={(e) => onDoorAddressChange({ house: e.target.value })}
              placeholder="Дом"
              className="form-input w-full rounded-lg text-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Квартира / офис</label>
            <input
              type="text"
              value={doorAddress.apartment}
              onChange={(e) => onDoorAddressChange({ apartment: e.target.value })}
              placeholder="Квартира / офис"
              className="form-input w-full rounded-lg text-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Подъезд</label>
            <input
              type="text"
              value={doorAddress.entrance}
              onChange={(e) => onDoorAddressChange({ entrance: e.target.value })}
              placeholder="Подъезд"
              className="form-input w-full rounded-lg text-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Этаж</label>
            <input
              type="text"
              value={doorAddress.floor}
              onChange={(e) => onDoorAddressChange({ floor: e.target.value })}
              placeholder="Этаж"
              className="form-input w-full rounded-lg text-base min-h-[44px]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Домофон</label>
            <input
              type="text"
              value={doorAddress.intercom}
              onChange={(e) => onDoorAddressChange({ intercom: e.target.value })}
              placeholder="Домофон"
              className="form-input w-full rounded-lg text-base min-h-[44px]"
            />
          </div>
        </div>
      )}

      {/* Получатель */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Получатель (ФИО полностью)
        </label>
        <input
          type="text"
          value={recipientName}
          onChange={(e) => onRecipientNameChange(e.target.value)}
          placeholder="Иванов Иван Иванович"
          className="form-input w-full rounded-lg text-base min-h-[44px]"
        />
      </div>

      {/* Комментарий */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий к заказу</label>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Комментарий к заказу"
          rows={3}
          className="form-input w-full rounded-lg text-base resize-y"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
