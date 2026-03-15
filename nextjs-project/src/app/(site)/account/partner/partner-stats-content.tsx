import type { PartnerStatForPartner } from '@/services/partner.service';

interface PartnerStatsContentProps {
  stats: PartnerStatForPartner[];
  totalOrders: number;
  totalIncome: number;
}

export function PartnerStatsContent({
  stats,
  totalOrders,
  totalIncome,
}: PartnerStatsContentProps) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
          <p className="text-sm text-gray-500">Оплачено заказов по промокодам</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold text-text">{totalOrders}</p>
        </div>
        <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
          <p className="text-sm text-gray-500">Ваш доход</p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold text-text">
            {new Intl.NumberFormat('ru-RU', {
              style: 'currency',
              currency: 'RUB',
              maximumFractionDigits: 0,
            }).format(totalIncome)}
          </p>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
          <p className="text-sm text-gray-500">У вас пока нет привязанных промокодов.</p>
          <p className="mt-1 text-sm text-gray-500">Обратитесь к администратору для привязки промокода.</p>
        </div>
      ) : (
        <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white overflow-hidden">
          {/* Mobile: карточки по промокодам */}
          <div className="sm:hidden divide-y divide-gray-100">
            {stats.map((row) => (
              <div key={row.promoCodeId} className="p-4 flex flex-col gap-1">
                <span className="font-medium text-gray-900">{row.code}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-0 text-sm text-gray-600">
                  <span>Применений: {row.applicationsCount}</span>
                  <span>Оплачено: {row.ordersCount}</span>
                </div>
                <span className="text-sm font-medium text-text">
                  {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    maximumFractionDigits: 0,
                  }).format(row.partnerIncome)}
                </span>
              </div>
            ))}
          </div>
          {/* Desktop: таблица */}
          <div className="hidden sm:block overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Промокод
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Применений
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Оплачено
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ваш доход
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.map((row) => (
                <tr key={row.promoCodeId}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{row.applicationsCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{row.ordersCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      maximumFractionDigits: 0,
                    }).format(row.partnerIncome)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </section>
  );
}
