'use client';

import { useState, useEffect, useRef } from 'react';
import { getOrderStatusPresentation } from '@/lib/order-status-presentation';

interface OrderItemRow {
  id: string;
  quantity: number;
  price: number;
  productId?: string;
}

interface Order {
  id: string;
  userId: string | null;
  items: OrderItemRow[];
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

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  function isWithinDateRange(createdAt: string, start: string, end: string): boolean {
    const orderDate = new Date(createdAt);
    if (start) {
      const startDate = new Date(`${start}T00:00:00`);
      if (orderDate < startDate) return false;
    }
    if (end) {
      const endDate = new Date(`${end}T23:59:59.999`);
      if (orderDate > endDate) return false;
    }
    return true;
  }

  function formatPromoDiscount(promo: NonNullable<Order['promoCode']>): string {
    if (promo.discountType === 'percentage') {
      return `${promo.discountValue}%`;
    }
    return `${promo.discountValue.toFixed(2)} ₽`;
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.promoCode?.code.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesPromo =
      !selectedPromoCode || order.promoCode?.code === selectedPromoCode;

    const matchesDateRange = isWithinDateRange(order.createdAt, dateRange.start, dateRange.end);

    return matchesSearch && matchesPromo && matchesDateRange;
  });

  const revenueForSelectedPromo = selectedPromoCode
    ? filteredOrders.reduce((sum, order) => sum + order.total, 0)
    : null;
  const ordersCountForSelectedPromo = selectedPromoCode ? filteredOrders.length : null;

  const totalOrders = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const ordersWithPromo = filteredOrders.filter((order) => order.promoCodeId != null).length;
  const revenueWithPromo = filteredOrders
    .filter((order) => order.promoCodeId != null)
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
    return (
      <div className="admin-container">
        <div className="admin-content">
          <p className="text-gray-500">Загрузка статистики...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Статистика заказов</h1>

        {/* Статистические карточки */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 md:p-6">
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
        
        {/* Список заказов */}
        {filteredOrders.length === 0 ? (
          <div className="card p-8 text-center text-sm text-gray-500">Нет заказов для отображения</div>
        ) : (
          <>
            {/* Мобильная версия: карточки */}
            <div className="md:hidden space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="card p-4">
                  <p className="text-xs font-mono text-gray-500 break-all">{order.id}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{formatDate(order.createdAt)}</p>
                  <p className="font-medium text-gray-900 mt-1">{order.total.toFixed(2)} ₽</p>
                  {order.promoCode ? (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {order.promoCode.code} ({formatPromoDiscount(order.promoCode)})
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 mt-0.5">—</p>
                  )}
                  <span className={`inline-flex w-fit mt-2 px-2 py-0.5 text-xs font-semibold rounded-full ${
                    getOrderStatusPresentation(order.status).badgeClassName
                  }`}>
                    {getOrderStatusPresentation(order.status).label}
                  </span>
                </div>
              ))}
            </div>

            {/* Десктоп: таблица */}
            <div className="hidden md:block card overflow-hidden">
              <div className="table-responsive">
                <table className="table table-horizontal">
                  <thead>
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID заказа</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Промокод</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{order.total.toFixed(2)} ₽</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {order.promoCode ? (
                            <div>
                              <div className="font-medium">{order.promoCode.code}</div>
                              <div className="text-xs text-gray-500">
                                {formatPromoDiscount(order.promoCode)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            getOrderStatusPresentation(order.status).badgeClassName
                          }`}>
                            {getOrderStatusPresentation(order.status).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}