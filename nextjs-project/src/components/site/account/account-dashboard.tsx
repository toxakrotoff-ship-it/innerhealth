import Link from 'next/link'

export interface AccountDashboardProps {
  userName: string
  userEmail: string
  orderCount: number
  totalSpent: number
  userRole?: string
}

export function AccountDashboard({
  userName,
  userEmail,
  orderCount,
  totalSpent,
  userRole,
}: AccountDashboardProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-text">Личный кабинет</h1>
        <p className="mt-2 text-sm text-gray-600">{userName}</p>
        <p className="text-sm text-gray-500">{userEmail}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Заказов</p>
          <p className="mt-2 text-3xl font-semibold text-text">{orderCount}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Потрачено</p>
          <p className="mt-2 text-3xl font-semibold text-text">{totalSpent.toFixed(2)} ₽</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="rounded-full border border-gray-300 bg-white px-5 py-3 text-center text-sm font-medium text-text transition hover:border-action-blue"
        >
          Мои заказы
        </Link>
        <Link
          href="/account/addresses"
          className="rounded-full border border-gray-300 bg-white px-5 py-3 text-center text-sm font-medium text-text transition hover:border-action-blue"
        >
          Мои адреса
        </Link>
        {userRole === 'PARTNER' && (
          <Link
            href="/account/partner"
            className="rounded-full border border-gray-300 bg-white px-5 py-3 text-center text-sm font-medium text-text transition hover:border-action-blue"
          >
            Партнёрская программа
          </Link>
        )}
      </div>
    </section>
  )
}
