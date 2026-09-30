'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { CheckoutEventType, CheckoutStatus, CheckoutStep } from '@prisma/client'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'
import {
  CHECKOUT_EVENT_TYPE_LABELS,
  CHECKOUT_STATUS_LABELS,
  CHECKOUT_STEP_LABELS,
} from '@/lib/checkout-event-labels'
import { getCheckoutReason } from '@/lib/checkout-session-reason'
import Button from '@/components/ui/button'

interface CheckoutSessionCartItemSnapshot {
  productId: string
  title?: string
  quantity: number
  price: number
}

interface CheckoutEventItem {
  id: string
  eventType: CheckoutEventType
  step: CheckoutStep | null
  metadata: unknown
  createdAt: string
}

interface CheckoutSessionDetail {
  id: string
  brand: string
  userId: string | null
  fullName: string | null
  phone: string | null
  email: string | null
  cartSnapshot: CheckoutSessionCartItemSnapshot[] | null
  cartItemsCount: number
  cartTotal: number | null
  promoCode: string | null
  deliveryMethod: string | null
  deliverySum: number | null
  currentStep: CheckoutStep
  lastCompletedStep: CheckoutStep | null
  status: CheckoutStatus
  paymentProvider: string | null
  paymentId: string | null
  paymentStatus: string | null
  createdAt: string
  lastActivityAt: string
  completedAt: string | null
  events: CheckoutEventItem[]
  order: { id: string; orderNumber: number; status: string } | null
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEventDate(dateString: string): string {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatMoney(value: number | null): string {
  if (value == null) return '—'
  return `${value.toLocaleString('ru-RU')} ₽`
}

function eventMetadataText(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const record = metadata as Record<string, unknown>
  if (typeof record.code === 'string' || typeof record.message === 'string') {
    const parts = [
      typeof record.code === 'string' ? record.code : null,
      typeof record.message === 'string' ? record.message : null,
    ].filter(Boolean)
    return parts.join(' — ') || null
  }
  return null
}

const CART_ACTION_LABELS: Record<string, string> = {
  page_mounted: 'Открыл корзину',
  cart_quantity_changed: 'Изменил количество товара',
  cart_item_removed: 'Удалил товар из корзины',
  promo_apply_started: 'Попробовал применить промокод',
  promo_apply_result: 'Результат применения промокода',
  saved_address_selected: 'Выбрал сохранённый адрес',
  saved_address_used: 'Применил сохранённый адрес',
  saved_address_cleared: 'Перешёл к ручному вводу адреса',
  contact_field_completed: 'Заполнил контактное поле',
  privacy_changed: 'Изменил согласие на обработку данных',
  delivery_mode_changed: 'Переключил способ получения',
  cdek_input_mode_changed: 'Переключил способ выбора СДЭК',
  manual_mode_auto_fallback: 'Карта не загрузилась, открыт ручной выбор',
  manual_city_selected: 'Выбрал город СДЭК вручную',
  manual_pvz_chosen: 'Подтвердил ПВЗ СДЭК вручную',
  manual_pvz_cleared: 'Снял выбор ПВЗ СДЭК',
  manual_points_loaded: 'Загрузились ПВЗ СДЭК',
  manual_points_failed: 'Ошибка загрузки ПВЗ СДЭК',
  manual_tariff_ready: 'Рассчитан тариф СДЭК',
  manual_tariff_failed: 'Ошибка расчёта тарифа СДЭК',
  manual_tariff_retry: 'Повторил расчёт тарифа СДЭК',
  cdek_map_slow: 'Карта СДЭК загружалась дольше 12 секунд',
  cdek_widget_mode_change: 'Переключил режим карты СДЭК',
  cdek_widget_choose: 'Выбрал доставку в виджете СДЭК',
  cdek_widget_calculate: 'Виджет рассчитал тарифы СДЭК',
  cdek_widget_status: 'Изменился статус карты СДЭК',
  checkout_validation_failed: 'Проверка оформления не прошла',
  checkout_submit_start: 'Нажал «Оформить заказ»',
  checkout_submit_failed: 'Сервер отклонил оформление',
  checkout_submit_error: 'Ошибка при оформлении',
  checkout_submit_success: 'Заказ создан в браузере',
  resolve_city_failed: 'Не удалось определить город СДЭК',
  resolve_city_empty: 'Город СДЭК не найден',
  resolve_city_error: 'Ошибка поиска города СДЭК',
  resolve_city_success: 'Город СДЭК определён',
  config_failed: 'Ошибка конфигурации виджета СДЭК',
  init_failed: 'Ошибка запуска виджета СДЭК',
  init_timeout: 'Таймаут запуска виджета СДЭК',
  missing_yandex_maps_key: 'Нет ключа Яндекс Карт',
  parcels_sync_failed: 'Ошибка передачи корзины в виджет СДЭК',
  init_start: 'Запуск карты СДЭК',
  config_loaded: 'Конфигурация карты СДЭК загружена',
  ready: 'Карта СДЭК готова',
  retry: 'Повторил загрузку карты СДЭК',
  expand_offices_background_failed: 'Ошибка фоновой загрузки ПВЗ СДЭК',
}

function cartActivityText(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const record = metadata as Record<string, unknown>
  const action = typeof record.action === 'string' ? record.action : ''
  const label = CART_ACTION_LABELS[action]
  if (!label) return null
  const data = record.data && typeof record.data === 'object'
    ? record.data as Record<string, unknown>
    : {}
  const deliveryLabels: Record<string, string> = {
    pickup: 'самовывоз из офиса', cdek_pvz: 'СДЭК ПВЗ', cdek_door: 'СДЭК до двери',
  }
  const reasonLabels: Record<string, string> = {
    missing_contact: 'нет имени', invalid_phone: 'некорректный телефон',
    invalid_email: 'некорректный email', missing_city_code: 'не выбран город',
    missing_pvz_or_tariff: 'нет ПВЗ или тарифа', missing_door_tariff: 'нет тарифа до двери',
    missing_door_address: 'не заполнен адрес', privacy_not_accepted: 'нет согласия',
  }
  const parts = [
    typeof data.deliveryMethod === 'string' ? deliveryLabels[data.deliveryMethod] ?? null : null,
    typeof data.mode === 'string' ? (data.mode === 'map' ? 'карта' : 'ручной ввод') : null,
    typeof data.widgetStatus === 'string' ? data.widgetStatus : null,
    typeof data.reason === 'string' ? reasonLabels[data.reason] ?? null : null,
    typeof data.pvzCode === 'string' ? `ПВЗ ${data.pvzCode}` : null,
    typeof data.tariffCode === 'number' ? `тариф ${data.tariffCode}` : null,
    typeof data.deliverySum === 'number' ? `${data.deliverySum} ₽` : null,
    typeof data.pointsCount === 'number' ? `${data.pointsCount} ПВЗ` : null,
    typeof data.field === 'string' ? `поле ${data.field}` : null,
    typeof data.status === 'number' ? `HTTP ${data.status}` : null,
    typeof data.valid === 'boolean' ? (data.valid ? 'корректно' : 'ошибка') : null,
  ].filter(Boolean)
  return parts.length ? `${label} · ${parts.join(', ')}` : label
}

export default function CheckoutSessionDetailPage() {
  const base = useAdminBasePath()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [session, setSession] = useState<CheckoutSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<Record<string, boolean>>({})

  const fetchSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const response = await fetch(`/api/admin/checkout-sessions/${id}`, { credentials: 'include' })
      if (response.status === 404) {
        setNotFound(true)
        return
      }
      if (!response.ok) throw new Error(`Ошибка: ${response.status}`)
      const data = (await response.json()) as CheckoutSessionDetail
      setSession(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchSession()
  }, [fetchSession])

  if (loading) {
    return (
      <div className="admin-card p-6 text-center text-gray-500 dark:text-gray-400">Загрузка…</div>
    )
  }

  if (notFound) {
    return (
      <div className="admin-card p-6 text-center text-gray-500 dark:text-gray-400">
        Сессия не найдена
        <div className="mt-4">
          <Link href={`/${base}/checkout-sessions`} className="text-blue-600 hover:underline dark:text-blue-400">
            ← Назад к списку
          </Link>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="admin-card p-6">
        <div className="alert error flex items-center gap-3">
          <span className="text-destructive font-medium">Ошибка</span>
          <span className="text-sm">{error}</span>
          <Button variant="secondary" size="sm" onClick={() => void fetchSession()}>
            Повторить
          </Button>
        </div>
      </div>
    )
  }

  const reason = getCheckoutReason(session)

  return (
    <div className="space-y-4">
      <div className="admin-page-header">
        <Link
          href={`/${base}/checkout-sessions`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Незавершённые оформления
        </Link>
        <h1>Оформление от {formatDate(session.createdAt)}</h1>
        <p>{reason}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-card p-4 space-y-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Клиент</h2>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Имя</dt>
              <dd className="text-gray-800 dark:text-gray-100">{session.fullName || 'не указано'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Телефон</dt>
              <dd className="text-gray-800 dark:text-gray-100">
                {session.phone ? <a href={`tel:${session.phone}`} className="hover:underline">{session.phone}</a> : 'не указано'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-gray-800 dark:text-gray-100">
                {session.email ? <a href={`mailto:${session.email}`} className="hover:underline">{session.email}</a> : 'не указано'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Аккаунт</dt>
              <dd className="text-gray-800 dark:text-gray-100">
                {session.userId ? (
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    Пользователь
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">Гость</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="admin-card p-4 space-y-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Checkout</h2>
          <dl className="text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Начат</dt>
              <dd className="text-gray-800 dark:text-gray-100">{formatDate(session.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Последняя активность</dt>
              <dd className="text-gray-800 dark:text-gray-100">{formatDate(session.lastActivityAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Текущий этап</dt>
              <dd className="text-gray-800 dark:text-gray-100">{CHECKOUT_STEP_LABELS[session.currentStep]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Последний завершённый этап</dt>
              <dd className="text-gray-800 dark:text-gray-100">
                {session.lastCompletedStep ? CHECKOUT_STEP_LABELS[session.lastCompletedStep] : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Статус</dt>
              <dd className="text-gray-800 dark:text-gray-100">{CHECKOUT_STATUS_LABELS[session.status]}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-card p-4 space-y-2 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Корзина</h2>
          {session.cartSnapshot && session.cartSnapshot.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="py-1.5 pr-4 font-medium">Товар</th>
                    <th className="whitespace-nowrap py-1.5 pr-4 font-medium">Кол-во</th>
                    <th className="whitespace-nowrap py-1.5 pr-4 font-medium">Цена</th>
                    <th className="whitespace-nowrap py-1.5 pr-4 font-medium">Итог</th>
                  </tr>
                </thead>
                <tbody>
                  {session.cartSnapshot.map((item, index) => (
                    <tr key={`${item.productId}-${index}`} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                      <td className="py-1.5 pr-4 text-gray-800 dark:text-gray-100">{item.title ?? item.productId}</td>
                      <td className="whitespace-nowrap py-1.5 pr-4 text-gray-600 dark:text-gray-300">{item.quantity}</td>
                      <td className="whitespace-nowrap py-1.5 pr-4 text-gray-600 dark:text-gray-300">{formatMoney(item.price)}</td>
                      <td className="whitespace-nowrap py-1.5 pr-4 text-gray-600 dark:text-gray-300">
                        {formatMoney(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Снимок корзины отсутствует</p>
          )}
          <dl className="text-sm space-y-1 pt-2">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Промокод</dt>
              <dd className="text-gray-800 dark:text-gray-100">{session.promoCode || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Доставка</dt>
              <dd className="text-gray-800 dark:text-gray-100">
                {session.deliveryMethod ? `${session.deliveryMethod} · ${formatMoney(session.deliverySum)}` : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 font-medium">
              <dt className="text-gray-500 dark:text-gray-400">Итоговая сумма</dt>
              <dd className="text-gray-800 dark:text-gray-100">{formatMoney(session.cartTotal)}</dd>
            </div>
          </dl>
        </section>

        {session.paymentId ? (
          <section className="admin-card p-4 space-y-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Платёж</h2>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Провайдер</dt>
                <dd className="text-gray-800 dark:text-gray-100">{session.paymentProvider || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Payment ID</dt>
                <dd className="text-gray-800 dark:text-gray-100 break-all">{session.paymentId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Статус</dt>
                <dd className="text-gray-800 dark:text-gray-100">{session.paymentStatus || '—'}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {session.order ? (
          <section className="admin-card p-4 space-y-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Заказ</h2>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Номер</dt>
                <dd>
                  <Link
                    href={`/${base}/orders?search=${session.order.orderNumber}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    №{session.order.orderNumber}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Статус заказа</dt>
                <dd className="text-gray-800 dark:text-gray-100">{session.order.status}</dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>

      <section className="admin-card p-4 space-y-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Timeline</h2>
        <ol className="space-y-2 text-sm">
          {session.events.map((event) => {
            const isOpen = showTechnicalDetails[event.id] ?? false
            const errorText = eventMetadataText(event.metadata)
            return (
              <li key={event.id} className="border-b border-gray-100 pb-2 last:border-0 dark:border-gray-800">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {formatEventDate(event.createdAt)}
                  </span>
                  <span className="text-gray-800 dark:text-gray-100">
                    {event.eventType === 'CART_INTERACTION'
                      ? cartActivityText(event.metadata) ?? CHECKOUT_EVENT_TYPE_LABELS[event.eventType]
                      : CHECKOUT_EVENT_TYPE_LABELS[event.eventType]}
                  </span>
                </div>
                {errorText ? <p className="mt-1 text-red-600 dark:text-red-400">{errorText}</p> : null}
                {event.metadata ? (
                  <div className="mt-1">
                    <button
                      type="button"
                      className="text-xs text-gray-500 hover:underline dark:text-gray-400"
                      onClick={() =>
                        setShowTechnicalDetails((prev) => ({ ...prev, [event.id]: !isOpen }))
                      }
                    >
                      {isOpen ? 'Скрыть техническую информацию' : 'Показать техническую информацию'}
                    </button>
                    {isOpen ? (
                      <pre className="mt-1 max-w-full overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
