'use client';

import { useState, useEffect, useRef } from 'react';

// Простой тип для заказа
interface Order {
  id: string;
  userId: string | null;
  items: any[];
  total: number;
  status: string;
  createdAt: string;
  promoCodeId: string | null;
  promoCode: {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
  } | null;
}

export default function OrdersStatisticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPromoCode, setSelectedPromoCode] = useState<string>('');
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  const [promoSuggestionsOpen, setPromoSuggestionsOpen] = useState(false);
  const promoSearchRef = useRef<HTMLDivElement>(null);
  const [allPromoCodes, setAllPromoCodes] = useState<{ code: string }[]>([]);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const promoSearchSuggestions = promoSearchQuery.trim().length >= 1
    ? allPromoCodes.filter((p) =>
        p.code.toLowerCase().includes(promoSearchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    fetchOrders();
    fetchPromoCodes();
  }, []);

  async function fetchPromoCodes() {
    try {
      const response = await fetch('/api/admin/promo-codes');
      if (!response.ok) return;
      const data = await response.json();
      setAllPromoCodes(
        (data as { code: string }[]).map((p) => ({ code: p.code })).sort((a, b) => a.code.localeCompare(b.code))
      );
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (promoSearchRef.current && !promoSearchRef.current.contains(event.target as Node)) {
        setPromoSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // #region agent log
  useEffect(() => {
    if (promoSearchQuery.trim().length < 1) return;
    const suggestions = allPromoCodes.filter((p) => p.code.toLowerCase().includes(promoSearchQuery.toLowerCase()));
    fetch('http://127.0.0.1:7242/ingest/4e38a816-a87e-4282-8acb-6d0b40fcac08', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'orders-statistics/page.tsx:useEffect(suggestions)', message: 'suggestions computed', data: { promoSearchQuery, allPromoCodesLength: allPromoCodes.length, allPromoCodesCodes: allPromoCodes.map((p) => p.code), suggestionsLength: suggestions.length, suggestionCodes: suggestions.map((p) => p.code) }, timestamp: Date.now(), hypothesisId: 'post-fix' }) }).catch(() => {});
  }, [promoSearchQuery, allPromoCodes]);
  // #endregion

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data);
      // #region agent log
      const withPromo = (data as Order[]).filter((o) => o.promoCode != null);
      const codesFromOrders = [...new Set(withPromo.map((o) => (o.promoCode as { code: string }).code))];
      fetch('http://127.0.0.1:7242/ingest/4e38a816-a87e-4282-8acb-6d0b40fcac08', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'orders-statistics/page.tsx:fetchOrders', message: 'orders loaded', data: { ordersCount: data.length, ordersWithPromoCount: withPromo.length, promoCodesFromOrders: codesFromOrders }, timestamp: Date.now(), hypothesisId: 'H1-H2' }) }).catch(() => {});
      // #endregion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.promoCode?.code.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesPromo =
      !selectedPromoCode || order.promoCode?.code === selectedPromoCode;

    const matchesDateRange =
      (!dateRange.start || new Date(order.createdAt) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(order.createdAt) <= new Date(dateRange.end));

    return matchesSearch && matchesPromo && matchesDateRange;
  });

  const revenueForSelectedPromo = selectedPromoCode
    ? filteredOrders.reduce((sum, order) => sum + order.total, 0)
    : null;
  const ordersCountForSelectedPromo = selectedPromoCode ? filteredOrders.length : null;

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const ordersWithPromo = orders.filter(order => order.promoCodeId !== null).length;
  const revenueWithPromo = orders
    .filter(order => order.promoCodeId !== null)
    .reduce((sum, order) => sum + order.total, 0);

  // Форматирование даты вручную
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="p-8">Загрузка статистики...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          <div className="text-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Статистика заказов</h1>
        
        {/* Статистические карточки */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="card">
            <div className="text-sm font-medium text-gray-500">Всего заказов</div>
            <div className="text-3xl font-bold mt-2">{totalOrders}</div>
          </div>

          <div className="card">
            <div className="text-sm font-medium text-gray-500">Общий доход</div>
            <div className="text-3xl font-bold mt-2">{totalRevenue.toFixed(2)} ₽</div>
          </div>

          <div className="card">
            <div className="text-sm font-medium text-gray-500">Заказы с промокодом</div>
            <div className="text-3xl font-bold mt-2">{ordersWithPromo}</div>
          </div>

          <div className="card">
            <div className="text-sm font-medium text-gray-500">Доход с промокодов</div>
            <div className="text-3xl font-bold mt-2">{revenueWithPromo.toFixed(2)} ₽</div>
          </div>

          <div className="card" ref={promoSearchRef}>
            <div className="text-sm font-medium text-gray-500 mb-2">Доход по промокоду</div>
            <div className="relative">
              <input
                type="text"
                className="form-input w-full text-base pr-9"
                placeholder="Поиск по промокоду..."
                value={promoSearchQuery.length > 0 ? promoSearchQuery : selectedPromoCode}
                onChange={(e) => {
                  setPromoSearchQuery(e.target.value);
                  setSelectedPromoCode('');
                  setPromoSuggestionsOpen(true);
                }}
                onFocus={() => setPromoSuggestionsOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setPromoSuggestionsOpen(false);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                aria-label="Поиск по промокоду"
                aria-autocomplete="list"
                aria-expanded={promoSuggestionsOpen && promoSearchSuggestions.length > 0}
              />
              {(promoSearchQuery.length >= 1 || promoSuggestionsOpen) && promoSearchSuggestions.length > 0 && (
                <ul
                  className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg max-h-48 overflow-auto"
                  role="listbox"
                >
                  {promoSearchSuggestions.map((p) => (
                    <li
                      key={p.code}
                      role="option"
                      className="cursor-pointer px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      onClick={() => {
                        setSelectedPromoCode(p.code);
                        setPromoSearchQuery('');
                        setPromoSuggestionsOpen(false);
                      }}
                    >
                      {p.code}
                    </li>
                  ))}
                </ul>
              )}
              {promoSearchQuery.trim().length >= 1 && promoSearchSuggestions.length === 0 && promoSuggestionsOpen && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-2 px-3 shadow-lg" role="listbox">
                  <li className="text-sm text-gray-500">Нет подходящих промокодов</li>
                </ul>
              )}
            </div>
            {revenueForSelectedPromo !== null && selectedPromoCode ? (
              <div className="mt-3">
                <div className="text-2xl font-bold">{revenueForSelectedPromo.toFixed(2)} ₽</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {ordersCountForSelectedPromo} заказ(ов)
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">Введите начало кода — появятся подсказки</p>
            )}
          </div>
        </div>

        {/* Фильтры */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
              <input
                type="text"
                placeholder="ID заказа или код промокода"
                className="form-input w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Начальная дата</label>
              <input
                type="date"
                className="form-input w-full"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Конечная дата</label>
              <input
                type="date"
                className="form-input w-full"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </div>
        
        {/* Таблица заказов */}
        <div className="card">
          <div className="table-responsive">
            <table className="table table-horizontal">
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID заказа
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Промокод
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                      Нет заказов для отображения
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {order.total.toFixed(2)} ₽
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {order.promoCode ? (
                          <div>
                            <div className="font-medium">{order.promoCode.code}</div>
                            <div className="text-xs text-gray-500">
                              {order.promoCode.discountType === 'percentage'
                                ? `${order.promoCode.discountValue}%`
                                : `${order.promoCode.discountValue} ₽`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'completed' ? 'Завершен' :
                           order.status === 'pending' ? 'В обработке' : 'Другое'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}