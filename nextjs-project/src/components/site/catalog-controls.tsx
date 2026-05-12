'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

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
  /** Тёмная витрина Sprint Power — панель и акценты в фирменных тонах */
  isSprintTheme?: boolean;
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
  isSprintTheme = false,
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

  const inputClass = cn(
    'form-input w-full',
    isSprintTheme &&
      'border-slate-600 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-[#7AA2FF]',
  );

  return (
    <div className="mb-8" ref={panelRef}>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            isSprintTheme
              ? 'border-slate-600 bg-slate-900/90 text-slate-100 hover:border-[#7AA2FF] hover:text-[#7AA2FF]'
              : 'border-gray-300 bg-white text-text hover:border-action-blue hover:text-action-blue',
          )}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Поиск и фильтры
        </button>
      </div>

      {isOpen && (
        <section
          className={cn(
            'rounded-2xl p-4 shadow-sm',
            isSprintTheme
              ? 'border border-slate-700 bg-[#0F172A] shadow-[0_20px_50px_rgba(0,0,0,0.35)]'
              : 'bg-white',
          )}
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr,1fr,1fr,1fr,auto]">
        <div className="relative">
          <label
            className={cn('mb-1 block text-xs font-medium', isSprintTheme ? 'text-slate-400' : 'text-gray-600')}
          >
            Поиск по названию и SKU
          </label>
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
            className={inputClass}
          />
          {showSuggestions && (q.trim().length > 0 || loadingSuggest) && (
            <div
              className={cn(
                'absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border p-2 shadow-lg',
                isSprintTheme
                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                  : 'border-gray-200 bg-white',
              )}
            >
              {loadingSuggest && (
                <p className={cn('px-2 py-2 text-sm', isSprintTheme ? 'text-slate-400' : 'text-gray-500')}>
                  Поиск...
                </p>
              )}
              {!loadingSuggest && suggestions.length === 0 && (
                <p className={cn('px-2 py-2 text-sm', isSprintTheme ? 'text-slate-400' : 'text-gray-500')}>
                  Подсказки не найдены
                </p>
              )}
              {!loadingSuggest &&
                suggestions.map((item) => {
                  const href = item.slug ? `/product/${item.slug}` : `/product/id/${item.id}`;
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className={cn(
                        'block rounded-lg px-2 py-2',
                        isSprintTheme ? 'hover:bg-slate-800' : 'hover:bg-gray-100',
                      )}
                      onClick={() => setShowSuggestions(false)}
                    >
                      <p
                        className={cn('text-sm font-medium', isSprintTheme ? 'text-slate-100' : 'text-text')}
                      >
                        {item.title}
                      </p>
                      <p className={cn('text-xs', isSprintTheme ? 'text-slate-400' : 'text-gray-500')}>
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
          <label
            className={cn('mb-1 block text-xs font-medium', isSprintTheme ? 'text-slate-400' : 'text-gray-600')}
          >
            Цена от
          </label>
          <input
            type="number"
            value={draftMinPrice}
            onChange={(e) => setDraftMinPrice(e.target.value)}
            onBlur={() => updateParams({ minPrice: draftMinPrice || null })}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div>
          <label
            className={cn('mb-1 block text-xs font-medium', isSprintTheme ? 'text-slate-400' : 'text-gray-600')}
          >
            Цена до
          </label>
          <input
            type="number"
            value={draftMaxPrice}
            onChange={(e) => setDraftMaxPrice(e.target.value)}
            onBlur={() => updateParams({ maxPrice: draftMaxPrice || null })}
            placeholder="99999"
            className={inputClass}
          />
        </div>
        <div>
          <label
            className={cn('mb-1 block text-xs font-medium', isSprintTheme ? 'text-slate-400' : 'text-gray-600')}
          >
            Сортировка
          </label>
          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className={inputClass}
          >
            <option value="newest">Как в каталоге</option>
            <option value="price_asc">Цена: по возрастанию</option>
            <option value="price_desc">Цена: по убыванию</option>
            <option value="name_asc">По названию</option>
          </select>
        </div>
        <div>
          <label
            className={cn('mb-1 block text-xs font-medium', isSprintTheme ? 'text-slate-400' : 'text-gray-600')}
          >
            Вид
          </label>
          <div
            className={cn('inline-flex rounded-xl p-1', isSprintTheme ? 'bg-slate-800/90' : 'bg-gray-100')}
          >
            <button
              type="button"
              onClick={() => updateParams({ view: 'grid' })}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                view === 'grid'
                  ? isSprintTheme
                    ? 'bg-[#7AA2FF] font-medium text-slate-950'
                    : 'bg-highlight-blue font-medium'
                  : isSprintTheme
                    ? 'text-slate-400'
                    : 'text-gray-600',
              )}
            >
              Плитка
            </button>
            <button
              type="button"
              onClick={() => updateParams({ view: 'list' })}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                view === 'list'
                  ? isSprintTheme
                    ? 'bg-[#7AA2FF] font-medium text-slate-950'
                    : 'bg-highlight-blue font-medium'
                  : isSprintTheme
                    ? 'text-slate-400'
                    : 'text-gray-600',
              )}
            >
              Список
            </button>
          </div>
        </div>
      </div>

      {visibleBrandOptions.length > 0 && (
        <div className="mt-4">
          <p className={cn('mb-2 text-xs font-medium', isSprintTheme ? 'text-slate-400' : 'text-gray-600')}>
            Бренд
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleBrandOptions.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => toggleBrand(brand)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  selectedBrandSet.has(brand)
                    ? isSprintTheme
                      ? 'border-[#7AA2FF] bg-[#7AA2FF]/15 text-slate-100'
                      : 'border-action-blue bg-highlight-blue text-text'
                    : isSprintTheme
                      ? 'border-slate-600 text-slate-300 hover:border-[#7AA2FF] hover:text-[#7AA2FF]'
                      : 'border-gray-300 text-gray-700 hover:border-action-blue hover:text-action-blue',
                )}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <label
          className={cn('inline-flex items-center gap-2 text-sm', isSprintTheme ? 'text-slate-300' : 'text-gray-700')}
        >
          <input
            type="checkbox"
            checked={promoOnly}
            onChange={(e) => updateParams({ promo: e.target.checked ? '1' : null })}
            className={cn(isSprintTheme && 'accent-[#7AA2FF]')}
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
          className={cn(
            'rounded-full border px-4 py-2 text-sm transition-colors',
            isSprintTheme
              ? 'border-slate-600 text-slate-200 hover:border-[#7AA2FF] hover:text-[#7AA2FF]'
              : 'border-gray-300 text-gray-700 hover:border-action-blue hover:text-action-blue',
          )}
        >
          Сбросить фильтры
        </button>
        <button
          type="button"
          onClick={() => {
            updateParams({ q: q.trim() || null, minPrice: draftMinPrice || null, maxPrice: draftMaxPrice || null });
            setShowSuggestions(false);
          }}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            isSprintTheme
              ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]'
              : 'bg-action-blue text-gray-800 hover:bg-action-blue/90',
          )}
        >
          Применить
        </button>
      </div>
        </section>
      )}
    </div>
  );
}
