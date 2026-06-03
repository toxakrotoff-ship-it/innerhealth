'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatOrderLabel } from '@/lib/order-label';
import type { PromoOrderTotalsResult } from '@/lib/promo-order-totals';
import {
  PromoReportOrderCard,
  type PromoReportOrderCardItem,
} from '@/app/admin/orders/promo-report/promo-report-order-card';

interface PromoReportSummary {
  ordersCount: number;
  reliableOrdersCount: number;
  incompleteOrdersCount: number;
  sumGoodsBeforePromo: number;
  sumPromoDiscount: number;
  sumGoodsAfterPromo: number;
}

interface PromoReportRow {
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

function getCurrentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    dateFrom: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    dateTo: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function formatSummaryMoney(value: number): string {
  return `${value.toFixed(2)} ₽`;
}

export default function PromoOrdersReportPage() {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [promoCode, setPromoCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState<PromoReportRow[]>([]);
  const [summary, setSummary] = useState<PromoReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const trimmedPromo = promoCode.trim();
      if (trimmedPromo) params.set('promoCode', trimmedPromo);

      const response = await fetch(`/api/admin/orders/promo-report?${params.toString()}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Не удалось загрузить отчёт');
      }
      const data = (await response.json()) as {
        summary: PromoReportSummary;
        rows: PromoReportRow[];
      };
      setSummary(data.summary);
      setRows(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      setSummary(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, promoCode]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    const termDigits = term.replace(/\D+/g, '');
    const orderNumberTerm = term.replace(/^#/, '').trim();

    return rows.filter((row) => {
      const nameMatch = row.customerName?.toLowerCase().includes(term) ?? false;
      const promoMatch = row.promoCode.toLowerCase().includes(term);
      const label = formatOrderLabel({
        orderId: row.id,
        orderNumber: row.orderNumber,
      }).toLowerCase();
      const labelMatch = label.includes(term) || row.id.toLowerCase().includes(term);

      if (/^\d+$/.test(orderNumberTerm)) {
        if (String(row.orderNumber).includes(orderNumberTerm)) return true;
      }
      if (termDigits && String(row.orderNumber).includes(termDigits)) return true;

      return nameMatch || promoMatch || labelMatch;
    });
  }, [rows, searchTerm]);

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Отчёт по промокодам
        </h1>
        <p className="text-sm text-gray-500 mb-6 max-w-3xl">
          Оплаченные заказы с промокодом за выбранный период. Заказы до марта 2026 могут не
          иметь сохранённой скидки; до мая 2026 — доставка оценена приблизительно. Сводные
          суммы считаются только по заказам с полными данными.
        </p>

        <div className="card mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">С</label>
              <input
                type="date"
                className="form-input w-full"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">По</label>
              <input
                type="date"
                className="form-input w-full"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Промокод</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Все промокоды"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="№ заказа (#63), ФИО, промокод"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void loadReport()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? 'Загрузка…' : 'Обновить'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="card p-4 text-red-700 mb-6">{error}</div>
        ) : null}

        {summary && !loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-xs text-gray-500">Заказов в периоде</p>
              <p className="text-xl font-semibold text-gray-900">{summary.ordersCount}</p>
              {summary.incompleteOrdersCount > 0 ? (
                <p className="text-xs text-amber-800 mt-1">
                  ещё {summary.incompleteOrdersCount} с неполными данными
                </p>
              ) : null}
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Товары до промо (надёжные)</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatSummaryMoney(summary.sumGoodsBeforePromo)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {summary.reliableOrdersCount} заказ(ов)
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Скидки (надёжные)</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatSummaryMoney(summary.sumPromoDiscount)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Товары после промо (надёжные)</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatSummaryMoney(summary.sumGoodsAfterPromo)}
              </p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="card p-8 text-center text-gray-500">Загрузка отчёта…</div>
        ) : filteredRows.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            {rows.length === 0 ? 'Нет заказов за период' : 'Ничего не найдено по поиску'}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRows.map((row) => (
              <PromoReportOrderCard key={row.id} {...row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
