import Link from 'next/link'

export interface AccountOrdersTableItem {
  id: string
  status: string
  total: number
  createdAt: Date
}

export interface AccountOrdersTableProps {
  items: AccountOrdersTableItem[]
  page: number
  totalPages: number
}

export function AccountOrdersTable({ items, page, totalPages }: AccountOrdersTableProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
        <h1 className="text-2xl font-semibold text-text">Мои заказы</h1>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Пока нет заказов.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-4">Заказ</th>
                  <th className="py-2 pr-4">Статус</th>
                  <th className="py-2 pr-4">Сумма</th>
                  <th className="py-2 pr-4">Дата</th>
                  <th className="py-2">Детали</th>
                </tr>
              </thead>
              <tbody>
                {items.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium text-text">{order.id}</td>
                    <td className="py-3 pr-4 text-gray-700">{order.status}</td>
                    <td className="py-3 pr-4 text-gray-700">{order.total.toFixed(2)} ₽</td>
                    <td className="py-3 pr-4 text-gray-700">{order.createdAt.toLocaleString('ru-RU')}</td>
                    <td className="py-3">
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="text-action-blue hover:underline"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link
              href={`/account/orders?page=${page - 1}`}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-action-blue"
            >
              Назад
            </Link>
          ) : null}
          <span className="text-sm text-gray-600">
            Страница {page} из {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/account/orders?page=${page + 1}`}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text transition hover:border-action-blue"
            >
              Вперёд
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
