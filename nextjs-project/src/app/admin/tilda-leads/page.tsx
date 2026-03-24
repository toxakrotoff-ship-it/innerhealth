'use client'

import React, { useState, useEffect } from 'react'

interface TildaLead {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  tildaDate: string
  tildaTranId: string
  input: string | null
  input2: string | null
  comment: string | null
  deliveryAddress: string | null
  review: string | null
  delivery: string | null
  promoCode: string | null
  createdAt: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cell(value: string | null): string {
  return value?.trim() || '—'
}

/** Элемент состава заказа (разные варианты полей в JSON от Тильды) */
interface CartItem {
  title?: string
  name?: string
  productName?: string
  quantity?: number
  qty?: number
  amount?: number
  price?: number
  sum?: number
}

interface OrderMeta {
  amount?: string | null
  prodAmount?: string | null
  discount?: string | null
  subtotal?: string | null
  paymentId?: string | null
  paymentStatus?: string | null
  paymentMethod?: string | null
  orderId?: string | null
  orderCurrency?: string | null
  deliveryName?: string | null
}

interface OrderMetaField {
  label: string
  value: string | null
}

/**
 * Пытается извлечь состав заказа из полей Input/Input_2 (часто там JSON от формы корзины Тильды).
 * Поддерживает массив объектов с полями title/name/productName, quantity/qty/amount, price/sum.
 */
function parseOrderItems(lead: TildaLead): CartItem[] | null {
  const primaryRaw = lead.input?.trim()
  const fallbackRaw = lead.input2?.trim()
  const raw = primaryRaw || fallbackRaw
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.cart) ? data.cart : null
    if (!arr || arr.length === 0) return null
    const hasPrice = arr.some((x: unknown) => typeof x === 'object' && x !== null && ('price' in x || 'sum' in x))
    const hasQty = arr.some((x: unknown) => typeof x === 'object' && x !== null && ('quantity' in x || 'qty' in x || 'amount' in x))
    const hasName = arr.some((x: unknown) => typeof x === 'object' && x !== null && ('title' in x || 'name' in x || 'productName' in x))
    if (hasName && (hasPrice || hasQty)) return arr as CartItem[]
    return null
  } catch {
    if (!primaryRaw) return null
    return parseProductLineItems(primaryRaw)
  }
}

function parseProductLineItems(raw: string): CartItem[] | null {
  const parts = raw
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  if (parts.length === 0) return null

  const linePattern = /^(.*?)\s*-\s*(\d+)x(\d+(?:[.,]\d+)?)\s*=\s*(\d+(?:[.,]\d+)?)$/
  const hasOrderPattern = parts.some((part) => linePattern.test(part))
  if (!hasOrderPattern) return null

  const items = parts.map((part) => {
    const match = part.match(linePattern)
    if (!match) return { title: part, quantity: 1, price: 0, sum: 0 }

    const title = match[1]?.trim() ?? part
    const quantity = Number(match[2] ?? 1)
    const price = Number((match[3] ?? '0').replace(',', '.'))
    const sum = Number((match[4] ?? '0').replace(',', '.'))
    return { title, quantity, price, sum }
  })

  return items.length > 0 ? items : null
}

function parseOrderMeta(lead: TildaLead): OrderMeta | null {
  const raw = lead.input2?.trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (Array.isArray(parsed) || typeof parsed !== 'object' || parsed === null) return null

    const meta: OrderMeta = {
      amount: toStringOrNull(parsed.amount),
      prodAmount: toStringOrNull(parsed.prodAmount),
      discount: toStringOrNull(parsed.discount),
      subtotal: toStringOrNull(parsed.subtotal),
      paymentId: toStringOrNull(parsed.paymentId),
      paymentStatus: toStringOrNull(parsed.paymentStatus),
      paymentMethod: toStringOrNull(parsed.paymentMethod),
      orderId: toStringOrNull(parsed.orderId),
      orderCurrency: toStringOrNull(parsed.orderCurrency),
      deliveryName: toStringOrNull(parsed.deliveryName),
    }

    const hasAny = Object.values(meta).some((value) => value && value.trim().length > 0)
    return hasAny ? meta : null
  } catch {
    return null
  }
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function formatOrderMoney(value: string | null | undefined, currencyCode: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.replace(',', '.').trim()
  if (normalized.length === 0) return null

  const currency = (currencyCode || 'RUB').toUpperCase()
  const numeric = Number(normalized)
  const currencySymbol = currency === 'RUB' ? '₽' : currency

  if (!Number.isFinite(numeric)) return `${value} ${currencySymbol}`
  return `${numeric.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol}`
}

function getItemTitle(item: CartItem): string {
  return (item.title ?? item.name ?? item.productName ?? '').trim() || '—'
}

function getItemQty(item: CartItem): number {
  return Number(item.quantity ?? item.qty ?? item.amount ?? 1) || 1
}

function getItemPrice(item: CartItem): number {
  const price = Number(item.price ?? 0)
  const sum = Number(item.sum ?? 0)
  const qty = getItemQty(item)
  if (price > 0) return price
  if (sum > 0 && qty >= 1) return sum / qty
  return sum || 0
}

/** Сумма по строке (цена × кол-во или уже готовая sum) */
function getItemRowSum(item: CartItem): number {
  const qty = getItemQty(item)
  const sum = Number(item.sum ?? 0)
  if (sum > 0 && qty <= 1) return sum
  return getItemPrice(item) * qty
}

export default function AdminTildaLeadsPage() {
  const [leads, setLeads] = useState<TildaLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/tilda-leads')
      if (!res.ok) throw new Error('Не удалось загрузить заявки')
      const data = await res.json()
      setLeads(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  async function handleCsvImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!csvFile) {
      setImportMessage('Выберите CSV-файл для импорта.')
      return
    }

    try {
      setIsImporting(true)
      setImportMessage(null)
      const formData = new FormData()
      formData.append('file', csvFile)
      const response = await fetch('/api/admin/tilda-leads', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || 'Не удалось импортировать CSV')
      }

      setImportMessage(
        `Импорт завершён: обновлено/создано ${result.upserted}, пропущено ${result.skipped}, ошибок ${result.errors}.`
      )
      setCsvFile(null)
      await fetchLeads()
    } catch (importError) {
      setImportMessage(
        importError instanceof Error ? importError.message : 'Ошибка импорта CSV'
      )
    } finally {
      setIsImporting(false)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const searchMatched =
      !searchTerm ||
      (lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (lead.phone?.includes(searchTerm) ?? false) ||
      (lead.tildaTranId?.includes(searchTerm) ?? false) ||
      (lead.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (lead.promoCode?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    if (!searchMatched) return false

    if (!dateFrom && !dateTo) return true

    const leadDate = new Date(lead.tildaDate)
    if (Number.isNaN(leadDate.getTime())) return false

    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`)
      if (leadDate < from) return false
    }

    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`)
      if (leadDate > to) return false
    }

    return true
  })

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <p className="text-gray-500">Загрузка заявок с Тильды...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        </div>
      </div>
    )
  }

  function LeadDetail({ lead }: { lead: TildaLead }) {
    const orderItems = parseOrderItems(lead)
    const orderMeta = parseOrderMeta(lead)
    const orderMetaFields: OrderMetaField[] = orderMeta
      ? [
          {
            label: 'Сумма заказа',
            value: formatOrderMoney(orderMeta.amount, orderMeta.orderCurrency),
          },
          {
            label: 'Сумма товаров',
            value: formatOrderMoney(orderMeta.prodAmount, orderMeta.orderCurrency),
          },
          {
            label: 'Скидка',
            value: formatOrderMoney(orderMeta.discount, orderMeta.orderCurrency),
          },
          {
            label: 'Subtotal',
            value: formatOrderMoney(orderMeta.subtotal, orderMeta.orderCurrency),
          },
          {
            label: 'Статус оплаты',
            value: orderMeta.paymentStatus ?? null,
          },
          {
            label: 'Способ оплаты',
            value: orderMeta.paymentMethod ?? null,
          },
          {
            label: 'Order ID',
            value: orderMeta.orderId ?? null,
          },
          {
            label: 'Payment ID',
            value: orderMeta.paymentId ?? null,
          },
          {
            label: 'Валюта',
            value: orderMeta.orderCurrency ?? null,
          },
          {
            label: 'Служба доставки',
            value: orderMeta.deliveryName ?? null,
          },
        ].filter((field) => field.value && field.value.trim().length > 0)
      : []

    return (
      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <div className="space-y-2">
          {orderItems && orderItems.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Состав заказа</h3>
              <div className="overflow-x-auto rounded border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600">Название</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600">Кол-во</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600">Цена</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {orderItems.map((item, idx) => {
                      const qty = getItemQty(item)
                      const price = getItemPrice(item)
                      const rowSum = getItemRowSum(item)
                      return (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-2 py-1.5">{getItemTitle(item)}</td>
                          <td className="px-2 py-1.5 text-right">{qty}</td>
                          <td className="px-2 py-1.5 text-right">{price > 0 ? `${price.toFixed(2)} ₽` : '—'}</td>
                          <td className="px-2 py-1.5 text-right">{rowSum > 0 ? `${rowSum.toFixed(2)} ₽` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-medium">
                    <tr>
                      <td colSpan={3} className="px-2 py-1.5 text-right">Итого</td>
                      <td className="px-2 py-1.5 text-right">
                        {orderItems.reduce((acc, item) => acc + getItemRowSum(item), 0).toFixed(2)} ₽
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          {lead.comment && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Комментарии</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{lead.comment}</p>
            </div>
          )}
          {lead.deliveryAddress && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Адрес доставки</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{lead.deliveryAddress}</p>
            </div>
          )}
          {lead.delivery && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Доставка</h3>
              <p className="text-gray-600">{lead.delivery}</p>
            </div>
          )}
          {orderMetaFields.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Параметры заказа</h3>
              <div className="grid grid-cols-1 gap-1 text-gray-600 sm:grid-cols-2">
                {orderMetaFields.map((field) => (
                  <p key={field.label}>
                    {field.label}: {field.value}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {!orderItems?.length && lead.input && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Input (сырые данные)</h3>
              <p className="text-gray-600 break-all whitespace-pre-wrap text-xs">{lead.input}</p>
            </div>
          )}
          {!orderItems?.length && lead.input2 && !orderMeta && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Input_2 (сырые данные)</h3>
              <p className="text-gray-600 break-all whitespace-pre-wrap text-xs">{lead.input2}</p>
            </div>
          )}
          {!orderItems?.length && (lead.input || lead.input2) && (
            <p className="text-gray-500 text-xs">
              Если здесь не состав заказа — в экспорте Тильды его может не быть.
            </p>
          )}
          {lead.review && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Отзыв</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{lead.review}</p>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-700 mb-1">ID заявки (Тильда)</h3>
            <p className="text-gray-600 font-mono text-xs">{lead.tildaTranId}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Заявки с Тильды</h1>
        <p className="text-gray-500 mb-6">
          Импортированные заявки из CSV Тильды (Email, имя, телефон, дата, комментарий, адрес доставки, промокод и др.).
        </p>

        <div className="card mb-6">
          <form className="mb-4 space-y-3" onSubmit={handleCsvImport}>
            <label className="block text-sm font-medium text-gray-700">Импорт CSV</label>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                type="file"
                accept=".csv,text/csv"
                className="form-input w-full md:max-w-md"
                onChange={(event) => {
                  setCsvFile(event.target.files?.[0] ?? null)
                  setImportMessage(null)
                }}
              />
              <button
                type="submit"
                disabled={isImporting}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImporting ? 'Импорт...' : 'Загрузить CSV'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              При совпадении данных карточка обновляется, дубликаты не создаются.
            </p>
            {importMessage && (
              <p className="text-sm text-gray-700">{importMessage}</p>
            )}
          </form>

          <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
          <input
            type="text"
            placeholder="Email, имя, телефон, ID заявки, комментарий, промокод"
            className="form-input w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Дата с</label>
              <input
                type="date"
                className="form-input w-full"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Дата по</label>
              <input
                type="date"
                className="form-input w-full"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            Нет заявок. Импортируйте CSV скриптом: npx ts-node scripts/import-tilda-leads.ts &lt;path-to-csv&gt;
          </div>
        ) : (
          <>
            {/* Мобильная версия: карточки */}
            <div className="md:hidden space-y-4">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="card p-4">
                  <p className="text-sm text-gray-500">{formatDate(lead.tildaDate)}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{cell(lead.name)}</p>
                  <div className="text-sm text-gray-600 mt-1">
                    {lead.email && <a href={`mailto:${lead.email}`} className="text-action-blue hover:underline block">{lead.email}</a>}
                    {lead.phone && <a href={`tel:${lead.phone.replace(/\s|\(|\)|-/g, '')}`} className="text-gray-600 hover:underline block">{lead.phone}</a>}
                    {!lead.email && !lead.phone && '—'}
                  </div>
                  {lead.promoCode && <p className="text-sm text-gray-500 mt-1">Промокод: {lead.promoCode}</p>}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mt-2"
                  >
                    {expandedId === lead.id ? 'Свернуть' : 'Подробнее'}
                  </button>
                  {expandedId === lead.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100"><LeadDetail lead={lead} /></div>
                  )}
                </div>
              ))}
            </div>

            {/* Десктоп: таблица */}
            <div className="hidden md:block card overflow-hidden">
              <div className="table-responsive">
                <table className="table table-horizontal">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата (Тильда)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Контакты</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Промокод</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <React.Fragment key={lead.id}>
                        <tr className="hover:bg-gray-50 border-b border-gray-100">
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(lead.tildaDate)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{cell(lead.name)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {lead.email && <a href={`mailto:${lead.email}`} className="text-action-blue hover:underline block">{lead.email}</a>}
                            {lead.phone && <a href={`tel:${lead.phone.replace(/\s|\(|\)|-/g, '')}`} className="text-gray-600 hover:underline block">{lead.phone}</a>}
                            {!lead.email && !lead.phone && '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{cell(lead.promoCode)}</td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                              {expandedId === lead.id ? 'Свернуть' : 'Подробнее'}
                            </button>
                          </td>
                        </tr>
                        {expandedId === lead.id && (
                          <tr key={`${lead.id}-detail`} className="bg-gray-50/80">
                            <td colSpan={5} className="px-4 py-4"><LeadDetail lead={lead} /></td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
