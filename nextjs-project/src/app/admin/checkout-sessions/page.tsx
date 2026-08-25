'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { CheckoutStatus, CheckoutStep } from '@prisma/client'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'
import { CHECKOUT_STATUS_LABELS } from '@/lib/checkout-event-labels'
import { getCheckoutReasonCompact, getCheckoutStepLabel } from '@/lib/checkout-session-reason'
import Button from '@/components/ui/button'

interface CheckoutSessionListItem {
  id: string
  createdAt: string
  lastActivityAt: string
  fullName: string | null
  phone: string | null
  email: string | null
  cartItemsCount: number
  cartTotal: number | null
  currentStep: CheckoutStep
  status: CheckoutStatus
  order: { id: string; orderNumber: number } | null
}

const PAGE_SIZE = 30

const STATUS_FILTER_OPTIONS: Array<{ value: CheckoutStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Все (кроме завершённых)' },
  { value: 'ACTIVE', label: CHECKOUT_STATUS_LABELS.ACTIVE },
  { value: 'ABANDONED', label: CHECKOUT_STATUS_LABELS.ABANDONED },
  { value: 'PAYMENT_FAILED', label: CHECKOUT_STATUS_LABELS.PAYMENT_FAILED },
  { value: 'PAYMENT_CANCELLED', label: CHECKOUT_STATUS_LABELS.PAYMENT_CANCELLED },
  { value: 'EXPIRED', label: CHECKOUT_STATUS_LABELS.EXPIRED },
  { value: 'COMPLETED', label: CHECKOUT_STATUS_LABELS.COMPLETED },
]

const STATUS_BADGE_CLASSES: Record<CheckoutStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  ABANDONED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  PAYMENT_FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  PAYMENT_CANCELLED: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  EXPIRED: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value: number | null): string {
  if (value == null) return '—'
  return `${value.toLocaleString('ru-RU')} ₽`
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export default function CheckoutSessionsPage() {
  const base = useAdminBasePath()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [status, setStatus] = useState<CheckoutStatus | 'ALL'>(() => {
    const value = searchParams.get('status')
    return value && STATUS_FILTER_OPTIONS.some((o) => o.value === value)
      ? (value as CheckoutStatus)
      : 'ALL'
  })
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<CheckoutSessionListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const search = useDebouncedValue(searchInput, 400)

  useEffect(() => {
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (search.trim()) params.set('search', search.trim())
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [status, search, pathname, router])

  useEffect(() => {
    setPage(1)
  }, [status, search])

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (status !== 'ALL') params.set('status', status)
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/admin/checkout-sessions?${params.toString()}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error(`Ошибка: ${response.status}`)
      const data = await response.json()
      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [status, search, page])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const hasNextPage = page * PAGE_SIZE < total

  return (
    <div>
      <div className="admin-page-header">
        <h1>Незавершённые оформления</h1>
        <p>Отслеживание брошенных корзин и незавершённых checkout-сессий</p>
      </div>

      <div className="admin-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as CheckoutStatus | 'ALL')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Поиск по телефону, email, имени, № заказа"
            className="min-w-[260px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {error ? (
          <div className="alert error flex items-center gap-3">
            <span className="text-destructive font-medium">Ошибка</span>
            <span className="text-sm">{error}</span>
            <Button variant="secondary" size="sm" onClick={() => void fetchSessions()}>
              Повторить
            </Button>
          </div>
        ) : (
          <div className="admin-table-wrap w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Дата</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Активность</th>
                  <th className="py-2 pr-4 font-medium">Клиент</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Телефон</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Корзина</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Сумма</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Этап</th>
                  <th className="py-2 pr-4 font-medium">Причина</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Статус</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Заказ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-gray-500 dark:text-gray-400">
                      Загрузка…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-gray-500 dark:text-gray-400">
                      Записей не найдено
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                    >
                      <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                        <Link href={`/${base}/checkout-sessions/${item.id}`} className="hover:underline">
                          {formatDate(item.createdAt)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                        {formatDate(item.lastActivityAt)}
                      </td>
                      <td className="py-2 pr-4 text-gray-800 dark:text-gray-100">{item.fullName || '—'}</td>
                      <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                        {item.phone || '—'}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{item.email || '—'}</td>
                      <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                        {item.cartItemsCount} шт.
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                        {formatMoney(item.cartTotal)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                        {getCheckoutStepLabel(item.currentStep)}
                      </td>
                      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">
                        {getCheckoutReasonCompact(item.status, item.currentStep)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[item.status]}`}
                        >
                          {CHECKOUT_STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4">
                        {item.order ? (
                          <Link
                            href={`/${base}/orders?search=${item.order.orderNumber}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            №{item.order.orderNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!error && total > 0 ? (
          <div className="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span>
              Стр. {page} · всего записей: {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Назад
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => setPage((current) => current + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
