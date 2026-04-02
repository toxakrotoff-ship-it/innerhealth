'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getOrderStatusPresentation } from '@/lib/order-status-presentation';

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
  cdekTrackNumber?: string | null;
  cdekOrderError?: string | null;
  deletedAt?: string | null;
}

interface AdminOrderDetailResponse extends Order {
  items: OrderItem[];
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

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [popupOrder, setPopupOrder] = useState<Order | null>(null);
  const [popupOrderDetail, setPopupOrderDetail] = useState<AdminOrderDetailResponse | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cdekLoadingId, setCdekLoadingId] = useState<string | null>(null);
  const [mode, setMode] = useState<'active' | 'trash'>('active');
  const [trashActionLoading, setTrashActionLoading] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    fetchOrders(mode);
  }, [mode]);

  useEffect(() => {
    if (!popupOrder) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPopupOrder(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popupOrder]);

  async function fetchOrders(currentMode: 'active' | 'trash') {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('mode', currentMode);
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        router.replace('/login');
        return;
      }
      if (!res.ok) throw new Error('Не удалось загрузить заказы');
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveToTrash(orderId: string) {
    if (!window.confirm('Отправить заказ в корзину? Он исчезнет из CRM и статистики, но его можно будет восстановить в течение недели.')) {
      return;
    }
    setTrashActionLoading(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/trash`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error ?? 'Не удалось отправить заказ в корзину');
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch {
      alert('Ошибка запроса');
    } finally {
      setTrashActionLoading(null);
    }
  }

  async function handleRestore(orderId: string) {
    setTrashActionLoading(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/restore`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error ?? 'Не удалось восстановить заказ');
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch {
      alert('Ошибка запроса');
    } finally {
      setTrashActionLoading(null);
    }
  }

  async function handleCleanupTrash() {
    if (!window.confirm('Очистить корзину окончательно? Заказы, удалённые более недели назад, будут удалены без возможности восстановления.')) {
      return;
    }
    setCleanupLoading(true);
    try {
      const res = await fetch('/api/admin/orders/trash/cleanup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error ?? 'Не удалось очистить корзину заказов');
        return;
      }
      // Обновим список корзины
      await fetchOrders('trash');
    } catch {
      alert('Ошибка запроса');
    } finally {
      setCleanupLoading(false);
    }
  }

  async function handleCreateCdekShipment(orderId: string, force = false) {
    if (
      force &&
      !window.confirm(
        'Пересоздать отгрузку СДЭК? Текущий UUID останется в истории СДЭК, а система попробует создать новую отгрузку.'
      )
    ) {
      return;
    }
    setCdekLoadingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cdek-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(force ? { force: true } : {}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  cdekOrderUuid: data.uuid ?? o.cdekOrderUuid,
                  cdekTrackNumber: data.trackNumber ?? o.cdekTrackNumber,
                  cdekOrderError: null,
                }
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

  async function handleOpenOrderPopup(order: Order) {
    setPopupOrder(order);
    setPopupOrderDetail(null);
    setPopupError(null);
    setPopupLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`);
      const data = await res.json();
      if (!res.ok) {
        setPopupError(data.error ?? 'Не удалось загрузить детали заказа');
        return;
      }
      setPopupOrderDetail(data as AdminOrderDetailResponse);
    } catch {
      setPopupError('Ошибка запроса');
    } finally {
      setPopupLoading(false);
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

  const getCdekTrackingLink = (trackNumber?: string | null) =>
    trackNumber
      ? `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(trackNumber)}`
      : null;

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
        <p className="text-gray-500">
          Детали состава доступны в{' '}
          <button
            type="button"
            onClick={() => void handleOpenOrderPopup(order)}
            className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            карточке заказа
          </button>
          {' '}в попапе.
        </p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          {order.shippingInfo?.deliveryMethod === 'pickup' ? 'Самовывоз' : 'Доставка'}
        </h3>
        {order.shippingInfo ? (
          <div className="text-gray-600 space-y-1">
            <p><strong>{order.shippingInfo.fullName}</strong></p>
            <p>{order.shippingInfo.phoneMasked}</p>
            <p>{order.shippingInfo.city}</p>
            <p>{order.shippingInfo.addressShort}</p>
          </div>
        ) : (
          <p className="text-gray-400">
            {order.shippingInfo?.deliveryMethod === 'pickup'
              ? 'Информация о самовывозе не указана'
              : 'Адрес доставки не указан'}
          </p>
        )}
        {(order.shippingInfo?.deliveryMethod === 'cdek_pvz' || order.shippingInfo?.deliveryMethod === 'cdek_door') && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">СДЭК</h3>
            {order.cdekOrderError ? (
              <>
                <p className="text-amber-700 mb-2">{order.cdekOrderError}</p>
                {order.cdekOrderUuid ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Невалидный UUID: <span className="font-mono">{order.cdekOrderUuid}</span>
                  </p>
                ) : null}
              </>
            ) : order.cdekTrackNumber ? (
              <>
                <p className="text-gray-900">
                  <span className="font-medium">Трек-номер:</span>{' '}
                  <span className="font-mono text-xs">{order.cdekTrackNumber}</span>
                </p>
                <a
                  href={getCdekTrackingLink(order.cdekTrackNumber) ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Открыть трекинг СДЭК
                </a>
                {order.cdekOrderUuid ? (
                  <p className="mt-1 text-xs text-gray-500">
                    UUID: <span className="font-mono">{order.cdekOrderUuid}</span>
                  </p>
                ) : null}
              </>
            ) : order.cdekOrderUuid ? (
              <>
                <p className="text-gray-600">
                  <span className="font-medium">UUID:</span>{' '}
                  <span className="font-mono text-xs">{order.cdekOrderUuid}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">Трек-номер ещё не присвоен</p>
              </>
            ) : null}
            {order.status === 'paid' && (
              <div className="mt-2 flex flex-wrap gap-3">
                {!order.cdekOrderUuid || !!order.cdekOrderError ? (
                  <button
                    type="button"
                    disabled={cdekLoadingId === order.id}
                    onClick={() => handleCreateCdekShipment(order.id)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {cdekLoadingId === order.id ? 'Создание…' : order.cdekOrderError ? 'Повторить создание отгрузки СДЭК' : 'Создать отгрузку в СДЭК'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={cdekLoadingId === order.id}
                    onClick={() => handleCreateCdekShipment(order.id, true)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {cdekLoadingId === order.id ? 'Пересоздание…' : 'Пересоздать отгрузку'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Заказы (CRM)</h1>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode('active')}
              className={`px-3 py-1.5 rounded-md ${
                mode === 'active'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Активные
            </button>
            <button
              type="button"
              onClick={() => setMode('trash')}
              className={`px-3 py-1.5 rounded-md ${
                mode === 'trash'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Корзина
            </button>
          </div>
          <div className="flex-1 md:max-w-xs">
            <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
            <input
              type="text"
              placeholder={mode === 'trash' ? 'ID заказа, телефон, ФИО (в корзине)' : 'ID заказа, телефон, ФИО'}
              className="form-input w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {mode === 'trash' && (
          <div className="card mb-4 border-amber-200 bg-amber-50/60">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-amber-900">
                Заказы в корзине не учитываются в CRM и статистике. Через неделю после удаления они могут быть очищены окончательно.
              </div>
              <button
                type="button"
                onClick={handleCleanupTrash}
                disabled={cleanupLoading}
                className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {cleanupLoading ? 'Очистка…' : 'Очистить корзину окончательно'}
              </button>
            </div>
          </div>
        )}

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
                        getOrderStatusPresentation(order.status).badgeClassName
                      }`}>{getOrderStatusPresentation(order.status).label}</span>
                    </div>
                            {mode === 'trash' && order.deletedAt && (
                              <p className="text-xs text-gray-500">
                                В корзине с {formatDate(order.deletedAt)}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <button
                                type="button"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                              >
                                {expandedId === order.id ? 'Свернуть' : 'Подробнее'}
                              </button>
                              {mode === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => handleMoveToTrash(order.id)}
                                  disabled={trashActionLoading === order.id}
                                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
                                >
                                  {trashActionLoading === order.id ? 'Перемещение…' : 'В корзину'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestore(order.id)}
                                  disabled={trashActionLoading === order.id}
                                  className="text-xs font-medium text-green-700 hover:text-green-900 disabled:opacity-60"
                                >
                                  {trashActionLoading === order.id ? 'Восстановление…' : 'Восстановить'}
                                </button>
                              )}
                            </div>
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
                            {mode === 'trash' && order.deletedAt && (
                              <div className="text-xs text-gray-500 mt-1">
                                В корзине с {formatDate(order.deletedAt)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(order.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.total.toFixed(2)} ₽</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              getOrderStatusPresentation(order.status).badgeClassName
                            }`}>{getOrderStatusPresentation(order.status).label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-end gap-1">
                              <button
                                type="button"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                              >
                                {expandedId === order.id ? 'Свернуть' : 'Подробнее'}
                              </button>
                              {mode === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => handleMoveToTrash(order.id)}
                                  disabled={trashActionLoading === order.id}
                                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
                                >
                                  {trashActionLoading === order.id ? 'Перемещение…' : 'В корзину'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestore(order.id)}
                                  disabled={trashActionLoading === order.id}
                                  className="text-xs font-medium text-green-700 hover:text-green-900 disabled:opacity-60"
                                >
                                  {trashActionLoading === order.id ? 'Восстановление…' : 'Восстановить'}
                                </button>
                              )}
                            </div>
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
      {popupOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setPopupOrder(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Карточка заказа ${popupOrder.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 p-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Заказ {popupOrder.id}</h2>
                <p className="text-sm text-gray-600">{formatDate(popupOrder.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setPopupOrder(null)}
                className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                Закрыть
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-4 space-y-4">
              <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <p><span className="font-medium">Статус:</span> {getOrderStatusPresentation(popupOrder.status).label}</p>
                <p><span className="font-medium">Сумма:</span> {popupOrder.total.toFixed(2)} ₽</p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Состав заказа</h3>
                {popupLoading ? (
                  <p className="text-sm text-gray-500">Загрузка состава заказа...</p>
                ) : popupError ? (
                  <p className="text-sm text-red-600">{popupError}</p>
                ) : popupOrderDetail?.items && popupOrderDetail.items.length > 0 ? (
                  <div className="overflow-x-auto rounded border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Товар</th>
                          <th className="px-3 py-2 text-right font-medium">Кол-во</th>
                          <th className="px-3 py-2 text-right font-medium">Цена</th>
                          <th className="px-3 py-2 text-right font-medium">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {popupOrderDetail.items.map((item) => (
                          <tr key={item.id} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-gray-800">{item.product.title}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{item.price.toFixed(2)} ₽</td>
                            <td className="px-3 py-2 text-right text-gray-700">{(item.price * item.quantity).toFixed(2)} ₽</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">В составе заказа пока нет товаров.</p>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  {popupOrder.shippingInfo?.deliveryMethod === 'pickup' ? 'Самовывоз' : 'Доставка'}
                </h3>
                {popupOrder.shippingInfo ? (
                  <div className="space-y-1 text-sm text-gray-700">
                    <p><strong>{popupOrder.shippingInfo.fullName}</strong></p>
                    <p>{popupOrder.shippingInfo.phoneMasked}</p>
                    <p>{popupOrder.shippingInfo.city}</p>
                    <p>{popupOrder.shippingInfo.addressShort}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {popupOrder.shippingInfo?.deliveryMethod === 'pickup'
                      ? 'Информация о самовывозе не указана.'
                      : 'Адрес доставки не указан.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
