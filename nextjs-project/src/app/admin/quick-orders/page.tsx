'use client'

import { useEffect, useState } from 'react'

interface QuickOrder {
  id: string
  name: string | null
  phone: string
  comment: string | null
  quantity: number
  status: string
  createdAt: string
  product: {
    id: string
    title: string
    slug: string | null
    price: number
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminQuickOrdersPage() {
  const [orders, setOrders] = useState<QuickOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/quick-orders', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить заявки')
        return response.json()
      })
      .then((data: QuickOrder[]) => setOrders(data))
      .catch((loadError) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Ошибка загрузки')
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [])

  return (
    <div className="admin-container">
      <div className="admin-page-header">
        <h1>Быстрые заявки</h1>
        <p>Заявки «Купить в 1 клик» с карточек товаров</p>
      </div>
      <div className="admin-content">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="card">
          {isLoading ? (
            <p className="text-gray-500">Загрузка...</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-500">Пока нет заявок.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-horizontal">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Товар</th>
                    <th>Контакт</th>
                    <th>Комментарий</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <div className="font-medium text-gray-900">{order.product.title}</div>
                        <div className="text-xs text-gray-500">
                          Кол-во: {order.quantity}, цена: {order.product.price.toLocaleString('ru-RU')} ₽
                        </div>
                      </td>
                      <td>
                        <div>{order.phone}</div>
                        {order.name && <div className="text-xs text-gray-500">{order.name}</div>}
                      </td>
                      <td className="max-w-[320px] whitespace-pre-line text-sm text-gray-700">
                        {order.comment || '—'}
                      </td>
                      <td>
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
