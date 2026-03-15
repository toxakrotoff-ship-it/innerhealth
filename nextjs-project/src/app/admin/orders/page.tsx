'use client';

import React, { useState, useEffect } from 'react';

interface OrderProduct {
  id: string;
  title: string;
  price: number;
  photo: string | null;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: OrderProduct;
}

interface ShippingInfoSummary {
  fullName: string;
  phoneMasked: string;
  phoneRaw: string;
  city: string;
  addressShort: string;
  deliveryMethod?: string | null;
}

interface PromoCodeInfo {
  code: string;
}

interface Order {
  id: string;
  userId: string | null;
  total: number;
  status: string;
  createdAt: string;
  promoCodeId?: string | null;
  items?: OrderItem[];
  shippingInfo: ShippingInfoSummary | null;
  promoCode: PromoCodeInfo | null;
  cdekOrderUuid?: string | null;
  cdekOrderError?: string | null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'В обработке',
    paid: 'Оплачен',
    completed: 'Завершён',
    cancelled: 'Отменён',
    canceled: 'Отменён',
    shipped: 'Отправлен',
  };
  return map[status] ?? status;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cdekLoadingId, setCdekLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/orders');
      if (!res.ok) throw new Error('Не удалось загрузить заказы');
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCdekShipment(orderId: string) {
    setCdekLoadingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cdek-shipment`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, cdekOrderUuid: data.uuid ?? o.cdekOrderUuid, cdekOrderError: null }
              : o
          )
        );
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, cdekOrderError: data.error ?? 'Ошибка СДЭК' } : o
          )
        );
        alert(data.error ?? 'Не удалось создать отгрузку СДЭК');
      }
    } catch {
      alert('Ошибка запроса');
    } finally {
      setCdekLoadingId(null);
    }
  }

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.trim();
    const termLower = term.toLowerCase();
    const termDigits = term.replace(/\D+/g, '');
    const phoneDigits = o.shippingInfo?.phoneRaw?.replace(/\D+/g, '') ?? '';

    return (
      o.id.toLowerCase().includes(termLower) ||
      (termDigits !== '' && phoneDigits.includes(termDigits)) ||
      o.shippingInfo?.phoneMasked?.includes(term) ||
      o.shippingInfo?.fullName?.toLowerCase().includes(termLower)
    );
  });

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <p className="text-gray-500">Загрузка заказов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        </div>
      </div>
    );
  }

  const orderDetailBlock = (order: Order) => (
    <div className="grid gap-4 sm:grid-cols-2 text-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Состав заказа</h3>
        <p className="text-gray-500">Детали состава доступны в отдельной карточке заказа.</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Доставка</h3>
        {order.shippingInfo ? (
          <div className="text-gray-600 space-y-1">
            <p><strong>{order.shippingInfo.fullName}</strong></p>
            <p>{order.shippingInfo.phoneMasked}</p>
            <p>{order.shippingInfo.city}</p>
            <p>{order.shippingInfo.addressShort}</p>
          </div>
        ) : (
          <p className="text-gray-400">Адрес доставки не указан</p>
        )}
        {(order.shippingInfo?.deliveryMethod === 'cdek_pvz' || order.shippingInfo?.deliveryMethod === 'cdek_door') && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">СДЭК</h3>
            {order.cdekOrderUuid ? (
              <p className="text-gray-600"><span className="font-mono text-xs">{order.cdekOrderUuid}</span></p>
            ) : order.cdekOrderError ? (
              <p className="text-amber-700 mb-2">{order.cdekOrderError}</p>
            ) : null}
            {order.status === 'paid' && !order.cdekOrderUuid && (
              <button
                type="button"
                disabled={cdekLoadingId === order.id}
                onClick={() => handleCreateCdekShipment(order.id)}
                className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                {cdekLoadingId === order.id ? 'Создание…' : 'Создать отгрузку в СДЭК'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Заказы (CRM)</h1>

        <div className="card mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
          <input
            type="text"
            placeholder="ID заказа, телефон, ФИО"
            className="form-input w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredOrders.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">Нет заказов</div>
        ) : (
          <>
            {/* Мобильная версия: карточки */}
            <div className="md:hidden space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="card p-4">
                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-gray-900">{order.shippingInfo?.fullName ?? '—'}</p>
                    <p className="text-sm text-gray-600">{order.shippingInfo?.phoneMasked ?? '—'}</p>
                    <p className="text-xs text-gray-400">{order.id}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{formatDate(order.createdAt)}</span>
                      <span className="text-sm font-medium">{order.total.toFixed(2)} ₽</span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        order.status === 'paid' || order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>{statusLabel(order.status)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mt-1"
                    >
                      {expandedId === order.id ? 'Свернуть' : 'Подробнее'}
                    </button>
                    {expandedId === order.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100">{orderDetailBlock(order)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Десктоп: таблица */}
            <div className="hidden md:block card overflow-hidden">
              <div className="table-responsive">
                <table className="table table-horizontal">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <React.Fragment key={order.id}>
                        <tr className="hover:bg-gray-50 border-b border-gray-100">
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-gray-900">{order.shippingInfo?.fullName ?? '—'}</div>
                            <div className="text-gray-600 mt-0.5">{order.shippingInfo?.phoneMasked ?? '—'}</div>
                            <div className="text-xs text-gray-400 mt-1" title="ID заказа">{order.id}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(order.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.total.toFixed(2)} ₽</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              order.status === 'paid' || order.status === 'completed' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                            }`}>{statusLabel(order.status)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                              {expandedId === order.id ? 'Свернуть' : 'Подробнее'}
                            </button>
                          </td>
                        </tr>
                        {expandedId === order.id && (
                          <tr key={`${order.id}-detail`} className="bg-gray-50/80">
                            <td colSpan={5} className="px-4 py-4">{orderDetailBlock(order)}</td>
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
  );
}
