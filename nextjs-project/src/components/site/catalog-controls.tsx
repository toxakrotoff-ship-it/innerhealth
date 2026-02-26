'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface SuggestionItem {
  id: string;
  title: string;
  slug: string | null;
  sku: string | null;
  price: number;
}

interface CatalogControlsProps {
  initialQuery: string;
  brandOptions: string[];
  selectedBrands: string[];
  minPrice?: number;
  maxPrice?: number;
  promoOnly?: boolean;
  sort: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
  view: 'grid' | 'list';
}

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

export function CatalogControls({
  initialQuery,
  brandOptions,
  selectedBrands,
  minPrice,
  maxPrice,
  promoOnly = false,
  sort,
  view,
}: CatalogControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [draftMinPrice, setDraftMinPrice] = useState(minPrice?.toString() ?? '');
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice?.toString() ?? '');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [isOpen, setIsOpen] = useState(
    Boolean(initialQuery || minPrice != null || maxPrice != null || promoOnly || selectedBrands.length > 0 || sort !== 'newest' || view !== 'grid')
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const debouncedQ = useDebouncedValue(q, 300);

  const updateParams = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    });
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setSuggestions([]);
      setLoadingSuggest(false);
      return;
    }

    const controller = new AbortController();
    setLoadingSuggest(true);

    fetch(`/api/catalog/suggest?q=${encodeURIComponent(debouncedQ)}&limit=8`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSuggestions(data);
      })
      .catch(() => {
        setSuggestions([]);
      })
      .finally(() => setLoadingSuggest(false));

    return () => controller.abort();
  }, [debouncedQ]);

  const selectedBrandSet = useMemo(() => new Set(selectedBrands), [selectedBrands]);
  const visibleBrandOptions = useMemo(
    () => brandOptions.filter((brand) => brand.trim().toLowerCase() !== 'inner health'),
    [brandOptions]
  );

  const toggleBrand = (brand: string) => {
    const next = new Set(selectedBrandSet);
    if (next.has(brand)) next.delete(brand);
    else next.add(brand);
    updateParams({ brand: next.size ? Array.from(next).join(',') : null });
  };

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  return (
    <div className="mb-8" ref={panelRef}>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text hover:border-action-blue hover:text-action-blue"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Поиск и фильтры
        </button>
      </div>

      {isOpen && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr,1fr,1fr,1fr,auto]">
        <div className="relative">
          <label className="mb-1 block text-xs font-medium text-gray-600">Поиск по названию и SKU</label>
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                updateParams({ q: q.trim() || null });
                setShowSuggestions(false);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Например, collagen или SKU"
            className="form-input w-full"
          />
          {showSuggestions && (q.trim().length > 0 || loadingSuggest) && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              {loadingSuggest && <p className="px-2 py-2 text-sm text-gray-500">Поиск...</p>}
              {!loadingSuggest && suggestions.length === 0 && (
                <p className="px-2 py-2 text-sm text-gray-500">Подсказки не найдены</p>
              )}
              {!loadingSuggest &&
                suggestions.map((item) => {
                  const href = item.slug ? `/product/${item.slug}` : `/product/id/${item.id}`;
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className="block rounded-lg px-2 py-2 hover:bg-gray-100"
                      onClick={() => setShowSuggestions(false)}
                    >
                      <p className="text-sm font-medium text-text">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {item.sku ? `SKU: ${item.sku} • ` : ''}
                        {item.price.toLocaleString('ru-RU')} ₽
                      </p>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Цена от</label>
          <input
            type="number"
            value={draftMinPrice}
            onChange={(e) => setDraftMinPrice(e.target.value)}
            onBlur={() => updateParams({ minPrice: draftMinPrice || null })}
            placeholder="0"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Цена до</label>
          <input
            type="number"
            value={draftMaxPrice}
            onChange={(e) => setDraftMaxPrice(e.target.value)}
            onBlur={() => updateParams({ maxPrice: draftMaxPrice || null })}
            placeholder="99999"
            className="form-input w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Сортировка</label>
          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="form-input w-full"
          >
            <option value="newest">Сначала новые</option>
            <option value="price_asc">Цена: по возрастанию</option>
            <option value="price_desc">Цена: по убыванию</option>
            <option value="name_asc">По названию</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Вид</label>
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => updateParams({ view: 'grid' })}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'grid' ? 'bg-highlight-blue font-medium' : 'text-gray-600'}`}
            >
              Плитка
            </button>
            <button
              type="button"
              onClick={() => updateParams({ view: 'list' })}
              className={`rounded-lg px-3 py-1.5 text-sm ${view === 'list' ? 'bg-highlight-blue font-medium' : 'text-gray-600'}`}
            >
              Список
            </button>
          </div>
        </div>
      </div>

      {visibleBrandOptions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-600">Бренд</p>
          <div className="flex flex-wrap gap-2">
            {visibleBrandOptions.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => toggleBrand(brand)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selectedBrandSet.has(brand)
                    ? 'border-action-blue bg-highlight-blue text-text'
                    : 'border-gray-300 text-gray-700 hover:border-action-blue hover:text-action-blue'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={promoOnly}
            onChange={(e) => updateParams({ promo: e.target.checked ? '1' : null })}
          />
          Только товары со скидкой
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            updateParams({
              q: null,
              minPrice: null,
              maxPrice: null,
              brand: null,
              promo: null,
              sort: 'newest',
              view: 'grid',
            })
          }
          className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:border-action-blue hover:text-action-blue"
        >
          Сбросить фильтры
        </button>
        <button
          type="button"
          onClick={() => {
            updateParams({ q: q.trim() || null, minPrice: draftMinPrice || null, maxPrice: draftMaxPrice || null });
            setShowSuggestions(false);
          }}
          className="rounded-full bg-action-blue px-4 py-2 text-sm font-medium text-gray-800 hover:bg-action-blue/90"
        >
          Применить
        </button>
      </div>
        </section>
      )}
    </div>
  );
}
