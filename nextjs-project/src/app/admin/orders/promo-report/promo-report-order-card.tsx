'use client';

import { formatOrderLabel } from '@/lib/order-label';
import { getOrderStatusPresentation } from '@/lib/order-status-presentation';
import type { PromoOrderTotalsResult } from '@/lib/promo-order-totals';

export interface PromoReportOrderCardItem {
  id: string;
  quantity: number;
  price: number;
  isGift: boolean;
  productTitle: string;
}

export interface PromoReportOrderCardProps {
  id: string;
  orderNumber: number;
  status: string;
  total: number;
  createdAt: string;
  customerName: string | null;
  promoCode: string;
  items: PromoReportOrderCardItem[];
  computed: PromoOrderTotalsResult;
}

function formatMoney(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(2)} ₽`;
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

export function PromoReportOrderCard({
  id,
  orderNumber,
  status,
  total,
  createdAt,
  customerName,
  promoCode,
  items,
  computed,
}: PromoReportOrderCardProps) {
  const statusPresentation = getOrderStatusPresentation(status);
  const orderLabel = formatOrderLabel({ orderId: id, orderNumber });

  return (
    <article className="card p-4 space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              {customerName?.trim() || '—'}
            </h2>
            <p className="text-sm font-medium text-gray-700">{orderLabel}</p>
          </div>
          <span
            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusPresentation.badgeClassName}`}
          >
            {statusPresentation.label}
          </span>
        </div>
        <p className="text-sm text-gray-500">{formatDate(createdAt)}</p>
        <p className="text-sm text-gray-700">
          Промокод: <span className="font-medium">{promoCode}</span>
          <span className="text-gray-500"> ({computed.nominalPromoLabel})</span>
        </p>
        {(computed.flags.missingPromoDiscount || computed.flags.shippingEstimated) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {computed.flags.missingPromoDiscount && (
              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-900">
                скидка не сохранена
              </span>
            )}
            {computed.flags.shippingEstimated && (
              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-900">
                доставка оценена
              </span>
            )}
          </div>
        )}
      </header>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Позиции</h3>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-gray-800"
            >
              <span>
                {item.productTitle}
                {item.isGift ? (
                  <span className="ml-2 text-xs text-emerald-700">подарок</span>
                ) : null}
              </span>
              <span className="text-gray-600 whitespace-nowrap">
                {item.quantity} × {item.price.toFixed(2)} ₽
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="text-gray-500">Товары до промо:</span>{' '}
          <span className="font-medium">{formatMoney(computed.goodsBeforePromo)}</span>
        </p>
        <p>
          <span className="text-gray-500">Скидка:</span>{' '}
          <span className="font-medium">{formatMoney(computed.promoDiscount)}</span>
          {computed.effectivePercent != null ? (
            <span
              className="text-gray-400 ml-1"
              title={`Фактическая скидка: ${computed.effectivePercent.toFixed(1)}%`}
            >
              ({computed.effectivePercent.toFixed(1)}%)
            </span>
          ) : null}
        </p>
        <p>
          <span className="text-gray-500">Товары после промо:</span>{' '}
          <span className="font-medium">{formatMoney(computed.goodsAfterPromo)}</span>
        </p>
        <p>
          <span className="text-gray-500">Доставка:</span>{' '}
          <span className="font-medium">{formatMoney(computed.shipping)}</span>
        </p>
        <p className="sm:col-span-2">
          <span className="text-gray-500">Итого заказа:</span>{' '}
          <span className="font-semibold text-gray-900">{total.toFixed(2)} ₽</span>
        </p>
      </div>
    </article>
  );
}
