'use client';

import type { PromoOrderTotalsResult } from '@/lib/promo-order-totals';

export function formatOrderMoney(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(2)} ₽`;
}

function shouldShowPromoBreakdown(financials: PromoOrderTotalsResult): boolean {
  return financials.flags.hasPromoCode || (financials.promoDiscount ?? 0) > 0;
}

export function OrderFinancialFlags({
  financials,
  className = '',
}: {
  financials: PromoOrderTotalsResult;
  className?: string;
}) {
  if (!financials.flags.missingPromoDiscount && !financials.flags.shippingEstimated) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {financials.flags.missingPromoDiscount ? (
        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
          скидка не сохранена
        </span>
      ) : null}
      {financials.flags.shippingEstimated ? (
        <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
          доставка оценена
        </span>
      ) : null}
    </div>
  );
}

export function OrderFinancialCompactSummary({
  financials,
}: {
  financials: PromoOrderTotalsResult;
}) {
  const showPromoBreakdown = shouldShowPromoBreakdown(financials);
  const lines: Array<{ label: string; value: string; tone?: string }> = [];

  if (showPromoBreakdown && financials.goodsBeforePromo != null) {
    lines.push({
      label: 'До скидки',
      value: formatOrderMoney(financials.goodsBeforePromo),
    });
  }

  if (showPromoBreakdown && financials.promoDiscount != null && financials.promoDiscount > 0) {
    lines.push({
      label: 'Скидка',
      value: `-${formatOrderMoney(financials.promoDiscount)}`,
      tone: 'text-emerald-700',
    });
  }

  if (financials.goodsAfterPromo != null) {
    lines.push({
      label: 'Товары',
      value: formatOrderMoney(financials.goodsAfterPromo),
    });
  }

  if ((financials.delivery ?? 0) > 0) {
    lines.push({
      label: 'Доставка',
      value: formatOrderMoney(financials.delivery),
    });
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="break-words text-sm font-semibold text-gray-900">
        {formatOrderMoney(financials.total)}
      </div>
      {lines.length > 0 ? (
        <div className="space-y-1 text-xs text-gray-500">
          {lines.map((line) => (
            <div key={line.label} className="flex items-start justify-between gap-3">
              <span className="min-w-0">{line.label}</span>
              <span className={`shrink-0 font-medium ${line.tone ?? 'text-gray-700'}`}>
                {line.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <OrderFinancialFlags financials={financials} />
    </div>
  );
}

export function OrderFinancialBreakdownPanel({
  financials,
  title = 'Финансы',
}: {
  financials: PromoOrderTotalsResult;
  title?: string;
}) {
  const showPromoBreakdown = shouldShowPromoBreakdown(financials);

  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">
            Одна и та же логика сумм, что и в checkout и письмах.
          </p>
        </div>
        <OrderFinancialFlags financials={financials} />
      </div>

      <dl className="space-y-2 text-sm">
        {showPromoBreakdown ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <dt className="min-w-0 text-gray-500">Стоимость товаров (до скидки)</dt>
              <dd className="shrink-0 font-medium text-gray-900">
                {formatOrderMoney(financials.goodsBeforePromo)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="min-w-0 text-gray-500">Скидка по промокоду</dt>
              <dd className="shrink-0 font-medium text-emerald-700">
                {financials.promoDiscount != null
                  ? `-${formatOrderMoney(financials.promoDiscount)}`
                  : '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="min-w-0 text-gray-500">Стоимость товаров со скидкой</dt>
              <dd className="shrink-0 font-medium text-gray-900">
                {formatOrderMoney(financials.goodsAfterPromo)}
              </dd>
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <dt className="min-w-0 text-gray-500">Товары</dt>
            <dd className="shrink-0 font-medium text-gray-900">
              {formatOrderMoney(financials.goodsAfterPromo)}
            </dd>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <dt className="min-w-0 text-gray-500">Доставка</dt>
          <dd className="shrink-0 font-medium text-gray-900">{formatOrderMoney(financials.delivery)}</dd>
        </div>
        <div className="flex items-start justify-between gap-3 border-t border-gray-100 pt-3">
          <dt className="min-w-0 font-medium text-gray-700">Итого</dt>
          <dd className="shrink-0 text-base font-semibold text-gray-900">
            {formatOrderMoney(financials.total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
