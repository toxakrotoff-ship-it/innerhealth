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

interface ShippingInfo {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

interface PromoCodeInfo {
  code: string;
  discountType: string;
  discountValue: number;
}

interface Order {
  id: string;
  userId: string | null;
  total: number;
  status: string;
  createdAt: string;
  promoCodeId: string | null;
  items: OrderItem[];
  shippingInfo: ShippingInfo | null;
  promoCode: PromoCodeInfo | null;
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
    completed: 'Завершён',
    cancelled: 'Отменён',
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

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.shippingInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.shippingInfo?.phone?.includes(searchTerm) ||
      o.shippingInfo?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Заказы (CRM)</h1>
        <p className="text-gray-500 mb-6">
          Просмотр заказов, состава и адресов доставки. Корзина и оформление заказа в разработке.
        </p>

        <div className="card mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
          <input
            type="text"
            placeholder="ID заказа, email, телефон, ФИО"
            className="form-input w-full max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table table-horizontal">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заказ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Нет заказов
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 border-b border-gray-100"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{order.total.toFixed(2)} ₽</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {expandedId === order.id ? 'Свернуть' : 'Подробнее'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === order.id && (
                        <tr key={`${order.id}-detail`} className="bg-gray-50/80">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid gap-6 sm:grid-cols-2">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Состав заказа</h3>
                                <ul className="space-y-2">
                                  {order.items.map((item) => (
                                    <li
                                      key={item.id}
                                      className="flex justify-between text-sm text-gray-600"
                                    >
                                      <span>
                                        {item.product.title} × {item.quantity}
                                      </span>
                                      <span>{item.price * item.quantity} ₽</span>
                                    </li>
                                  ))}
                                </ul>
                                {order.promoCode && (
                                  <p className="mt-2 text-sm text-gray-500">
                                    Промокод: {order.promoCode.code} (
                                    {order.promoCode.discountType === 'percentage'
                                      ? `${order.promoCode.discountValue}%`
                                      : `${order.promoCode.discountValue} ₽`}
                                    )
                                  </p>
                                )}
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Доставка</h3>
                                {order.shippingInfo ? (
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>{order.shippingInfo.fullName}</strong></p>
                                    <p>{order.shippingInfo.phone}</p>
                                    <p>{order.shippingInfo.email}</p>
                                    <p>
                                      {order.shippingInfo.country}, {order.shippingInfo.city},{' '}
                                      {order.shippingInfo.zipCode}
                                    </p>
                                    <p>{order.shippingInfo.address}</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 text-sm">Адрес доставки не указан</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
