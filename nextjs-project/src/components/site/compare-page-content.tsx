'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { clearCompareIds, getCompareIds, MAX_COMPARE_ITEMS } from '@/lib/browser-product-lists';

interface CompareProductItem {
  id: string;
  title: string;
  slug: string | null;
  photo: string | null;
  price: number;
  priceOld: number | null;
  brand: string | null;
  sku: string | null;
  characteristicsComposition: string | null;
  characteristicsNutrition100g: string | null;
  characteristicsEnergyValue100g: string | null;
  characteristicsShelfLife: string | null;
}

const COMPARE_ROWS: Array<{ key: keyof CompareProductItem; label: string }> = [
  { key: 'price', label: 'Цена' },
  { key: 'brand', label: 'Бренд' },
  { key: 'sku', label: 'SKU' },
  { key: 'characteristicsComposition', label: 'Состав' },
  { key: 'characteristicsNutrition100g', label: 'Пищевая ценность' },
  { key: 'characteristicsEnergyValue100g', label: 'Энергетическая ценность' },
  { key: 'characteristicsShelfLife', label: 'Срок годности' },
];

export function ComparePageContent() {
  const [ids, setIds] = useState<string[]>([]);
  const [items, setItems] = useState<CompareProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = getCompareIds().slice(0, MAX_COMPARE_ITEMS);
    setIds(stored);
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/products/compare-items?ids=${ids.join(',')}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = ids
            .map((id) => data.find((item: CompareProductItem) => item.id === id))
            .filter(Boolean) as CompareProductItem[];
          setItems(sorted);
        } else setItems([]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [ids]);

  const canCompare = useMemo(() => ids.length >= 2 && ids.length <= MAX_COMPARE_ITEMS, [ids.length]);

  if (ids.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">Список сравнения пуст.</p>
        <Link href="/catalog" className="mt-4 inline-flex rounded-full bg-action-blue px-5 py-2 text-sm font-medium text-gray-800">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!canCompare && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Для корректного сравнения выберите от 2 до {MAX_COMPARE_ITEMS} товаров.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            clearCompareIds();
            setIds([]);
            setItems([]);
          }}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:border-action-blue hover:text-action-blue"
        >
          Очистить список сравнения
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Загрузка данных для сравнения...</p>}
      {!loading && items.length > 0 && (
        <div className="overflow-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-[760px] w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Параметр
                </th>
                {items.map((item) => (
                  <th key={item.id} className="border-b border-gray-200 px-4 py-3 text-left align-top">
                    <Link href={item.slug ? `/product/${item.slug}` : `/product/id/${item.id}`} className="text-sm font-semibold text-text hover:text-action-blue">
                      {item.title}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">{row.label}</td>
                  {items.map((item) => {
                    const value = item[row.key];
                    const formatted = row.key === 'price'
                      ? `${Number(value ?? 0).toLocaleString('ru-RU')} ₽`
                      : value || '—';
                    return (
                      <td key={`${item.id}-${row.key}`} className="border-b border-gray-100 px-4 py-3 text-sm text-gray-700">
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
