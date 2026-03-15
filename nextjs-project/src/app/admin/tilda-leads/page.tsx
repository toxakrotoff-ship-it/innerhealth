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

/**
 * Пытается извлечь состав заказа из полей Input/Input_2 (часто там JSON от формы корзины Тильды).
 * Поддерживает массив объектов с полями title/name/productName, quantity/qty/amount, price/sum.
 */
function parseOrderItems(lead: TildaLead): CartItem[] | null {
  const raw = lead.input?.trim() || lead.input2?.trim()
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
    return null
  }
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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

  const filteredLeads = leads.filter(
    (l) =>
      (l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (l.phone?.includes(searchTerm) ?? false) ||
      (l.tildaTranId?.includes(searchTerm) ?? false) ||
      (l.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (l.promoCode?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

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
        </div>
        <div className="space-y-2">
          {!orderItems?.length && lead.input && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-1">Input (сырые данные)</h3>
              <p className="text-gray-600 break-all whitespace-pre-wrap text-xs">{lead.input}</p>
            </div>
          )}
          {!orderItems?.length && lead.input2 && (
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
          <input
            type="text"
            placeholder="Email, имя, телефон, ID заявки, комментарий, промокод"
            className="form-input w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
