'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getBrandDefinitions, isBrandId, type BrandId } from '@/lib/brand/brand'
import Button from '@/components/ui/button'

type EntityType = 'PRODUCT' | 'CATEGORY'
type LogAction = 'CREATE' | 'UPDATE' | 'DELETE'

interface ActivityLogItem {
  id: string
  createdAt: string
  actorEmail: string
  entityType: EntityType
  action: LogAction
  entityId: string
  entityName: string
  brand: string
  changes?: unknown
}

const ACTION_LABELS: Record<LogAction, string> = {
  CREATE: 'Добавил',
  UPDATE: 'Изменил',
  DELETE: 'Удалил',
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  PRODUCT: 'Товар',
  CATEGORY: 'Категория',
}

const FIELD_LABELS: Record<string, string> = {
  title: 'название',
  pageTitle: 'заголовок страницы',
  slug: 'slug',
  sku: 'артикул',
  mark: 'торговая марка',
  category: 'категория (текст)',
  categoryIds: 'категории',
  description: 'описание',
  text: 'текст',
  photo: 'фото (главное)',
  photos: 'фотографии',
  price: 'цена',
  priceOld: 'старая цена',
  discountPrice: 'цена со скидкой',
  quantity: 'остаток',
  isDraft: 'черновик',
  isPromoEligible: 'участие в акциях',
  isPreorderEnabled: 'предзаказ',
  isFeaturedInNewArrivals: 'в новинках',
  isPublished: 'публикация',
  showInCategoriesBlock: 'показ в блоке категорий',
  editions: 'варианты',
  modifications: 'модификации',
  externalId: 'внешний ID',
  parentUid: 'родительский товар',
  parentId: 'родительская категория',
  weight: 'вес',
  length: 'длина',
  width: 'ширина',
  height: 'высота',
  seoTitle: 'SEO-заголовок',
  seoDescr: 'SEO-описание',
  seoDescription: 'SEO-описание',
  seoKeywords: 'SEO-ключевые слова',
  fbTitle: 'заголовок для соцсетей',
  fbDescr: 'описание для соцсетей',
  tabs: 'вкладки',
  image: 'изображение',
  imageAlt: 'alt изображения',
  sortOrder: 'порядок сортировки',
  catalogTeaser: 'краткое описание',
  linePageBodyRichJson: 'контент страницы',
  featuredProductId: 'товар блока «купить»',
  showLegacyLinePageBlocks: 'старые блоки страницы',
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'да' : 'нет'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return ''
}

/** `changes` is either `{ fields: string[] }` (list of touched fields) or a plain key→value object (small updates). */
function formatChanges(changes: unknown): string | null {
  if (!changes || typeof changes !== 'object') return null
  const record = changes as Record<string, unknown>
  if (Array.isArray(record.fields)) {
    const fields = record.fields.filter((f): f is string => typeof f === 'string')
    if (fields.length === 0) return null
    return fields.map(fieldLabel).join(', ')
  }
  const entries = Object.entries(record)
  if (entries.length === 0) return null
  return entries
    .map(([key, value]) => {
      const formatted = formatChangeValue(value)
      return formatted ? `${fieldLabel(key)}: ${formatted}` : fieldLabel(key)
    })
    .join(', ')
}

const PAGE_SIZE = 30

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export default function ActivityLogsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [entityType, setEntityType] = useState<EntityType | 'ALL'>(() => {
    const value = searchParams.get('entityType')
    return value === 'PRODUCT' || value === 'CATEGORY' ? value : 'ALL'
  })
  const [brand, setBrand] = useState<BrandId | 'ALL'>(() => {
    const value = searchParams.get('brand')
    return value && isBrandId(value) ? value : 'ALL'
  })
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<ActivityLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const search = useDebouncedValue(searchInput, 400)

  useEffect(() => {
    const params = new URLSearchParams()
    if (entityType !== 'ALL') params.set('entityType', entityType)
    if (brand !== 'ALL') params.set('brand', brand)
    if (search.trim()) params.set('search', search.trim())
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [entityType, brand, search, pathname, router])

  useEffect(() => {
    setPage(1)
  }, [entityType, brand, search])

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
      if (entityType !== 'ALL') params.set('entityType', entityType)
      if (brand !== 'ALL') params.set('brand', brand)
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/admin/activity-logs?${params.toString()}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error(`Ошибка: ${response.status}`)
      const data = await response.json()
      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
      setHasNextPage(Boolean(data.hasNextPage))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [entityType, brand, search, page])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  const brandDefinitions = getBrandDefinitions()

  return (
    <div>
      <div className="admin-page-header">
        <h1>Лог действий</h1>
        <p>История изменений товаров и категорий по обеим витринам</p>
      </div>

      <div className="admin-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-600">
            {(['ALL', 'PRODUCT', 'CATEGORY'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setEntityType(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  entityType === value
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {value === 'ALL' ? 'Все' : ENTITY_TYPE_LABELS[value]}
              </button>
            ))}
          </div>

          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value as BrandId | 'ALL')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="ALL">Все витрины</option>
            {brandDefinitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Поиск по названию товара или категории"
            className="min-w-[240px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {error ? (
          <div className="alert error flex items-center gap-3">
            <span className="text-destructive font-medium">Ошибка</span>
            <span className="text-sm">{error}</span>
            <Button variant="secondary" size="sm" onClick={() => void fetchLogs()}>
              Повторить
            </Button>
          </div>
        ) : (
          <div className="admin-table-wrap w-full min-w-0 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Дата</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Автор</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Действие</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Тип</th>
                  <th className="py-2 pr-4 font-medium">Название</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Витрина</th>
                  <th className="py-2 pr-4 font-medium">Изменения</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500 dark:text-gray-400">
                      Загрузка…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500 dark:text-gray-400">
                      Записей не найдено
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const changesLabel = formatChanges(item.changes)
                    return (
                      <tr key={item.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                        <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                          {item.actorEmail || '—'}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-4">{ACTION_LABELS[item.action]}</td>
                        <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                          {ENTITY_TYPE_LABELS[item.entityType]}
                        </td>
                        <td className="py-2 pr-4 text-gray-800 dark:text-gray-100">{item.entityName}</td>
                        <td className="whitespace-nowrap py-2 pr-4 text-gray-600 dark:text-gray-300">
                          {brandDefinitions.find((definition) => definition.id === item.brand)?.label ?? item.brand}
                        </td>
                        <td className="max-w-[360px] py-2 pr-4 text-gray-600 dark:text-gray-300">
                          {changesLabel ?? '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!error && total > 0 ? (
          <div className="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
            <span>
              Стр. {page} · всего записей: {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Назад
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => setPage((current) => current + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
