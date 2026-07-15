'use client';

import { formatOrderLabel } from '@/lib/order-label';
import { getOrderStatusPresentation } from '@/lib/order-status-presentation';
import type { PromoOrderTotalsResult } from '@/lib/promo-order-totals';
import {
  OrderFinancialBreakdownPanel,
  OrderFinancialFlags,
} from '@/components/admin/order-financial-breakdown';

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
  total: _total,
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
        <OrderFinancialFlags financials={computed} className="pt-1" />
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

      <div className="pt-3 border-t border-gray-100">
        <OrderFinancialBreakdownPanel financials={computed} title="Сумма заказа" />
        {computed.effectivePercent != null ? (
          <p className="mt-2 text-xs text-gray-400">
            Фактическая скидка: {computed.effectivePercent.toFixed(1)}%
          </p>
        ) : null}
      </div>
    </article>
  );
}
