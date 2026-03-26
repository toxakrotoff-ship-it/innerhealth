'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, MouseEvent, ReactElement } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  PointerSensor,
  DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Drag, Trash } from 'iconoir-react'
import Button from '@/components/ui/button'
import { Product } from '@prisma/client'
import { NO_CATEGORY_ID } from '../constants'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'

type ProductWithCategories = Product & {
  categories?: {
    categoryId: string
    sortOrder?: number | null
    category?: { id: string; title: string }
  }[]
}

interface ProductTableProps {
  products: ProductWithCategories[]
  onRefresh: () => void
  selectedCategory: string | null
}

interface EditingState {
  productId: string
  field: 'price' | 'quantity' | 'sku' | 'brand'
  value: string
}

type SortKey = keyof Product | 'categoryTitle'

interface SortConfig {
  key: SortKey
  direction: 'asc' | 'desc'
}

interface ReorderPayloadItem {
  productId: string
  sortOrder: number
}

interface ProductRowProps {
  product: ProductWithCategories
  selectedCategory: string | null
  canReorder: boolean
  isSaving: boolean
  isDeleting: boolean
  isTogglingDraft: boolean
  editing: EditingState | null
  setEditing: (value: EditingState | null | ((prev: EditingState | null) => EditingState | null)) => void
  onStartEditPrice: () => void
  onStartEditQuantity: () => void
  onStartEditSku: () => void
  onStartEditBrand: () => void
  onDelete: (product: Product) => void
  saveInline: (productId: string, field: 'price' | 'quantity', value: string) => Promise<void>
  saveInlineSku: (productId: string, nextSku: string | null) => Promise<void>
  saveInlineBrand: (productId: string, nextBrand: 'inner' | 'sprint-power') => Promise<void>
  onToggleDraft: (productId: string, nextIsDraft: boolean) => void
}

function getCategoryLine(product: ProductWithCategories): string {
  if (!product.categories?.length) return '—'
  return (
    product.categories
      .map((pc) => pc.category?.title)
      .filter(Boolean)
      .join(', ') || '—'
  )
}

function formatQuantity(quantity: number | null): string {
  return quantity === null ? '∞' : String(quantity)
}

const MOBILE_SORT_OPTIONS: { label: string; value: string; config: SortConfig | null }[] = [
  { label: 'Как в списке (без сортировки)', value: '', config: null },
  { label: 'Дата — сначала новые', value: 'createdAt:desc', config: { key: 'createdAt', direction: 'desc' } },
  { label: 'Дата — сначала старые', value: 'createdAt:asc', config: { key: 'createdAt', direction: 'asc' } },
  { label: 'Название А → Я', value: 'title:asc', config: { key: 'title', direction: 'asc' } },
  { label: 'Название Я → А', value: 'title:desc', config: { key: 'title', direction: 'desc' } },
  { label: 'Раздел А → Я', value: 'categoryTitle:asc', config: { key: 'categoryTitle', direction: 'asc' } },
  { label: 'Раздел Я → А', value: 'categoryTitle:desc', config: { key: 'categoryTitle', direction: 'desc' } },
  { label: 'Цена — по возрастанию', value: 'price:asc', config: { key: 'price', direction: 'asc' } },
  { label: 'Цена — по убыванию', value: 'price:desc', config: { key: 'price', direction: 'desc' } },
  { label: 'Остаток — по возрастанию', value: 'quantity:asc', config: { key: 'quantity', direction: 'asc' } },
  { label: 'Остаток — по убыванию', value: 'quantity:desc', config: { key: 'quantity', direction: 'desc' } },
  { label: 'Сайт — сначала на сайте', value: 'isDraft:asc', config: { key: 'isDraft', direction: 'asc' } },
  { label: 'Сайт — сначала скрытые', value: 'isDraft:desc', config: { key: 'isDraft', direction: 'desc' } },
]

function mobileSortSelectValue(sortConfig: SortConfig | null): string {
  if (!sortConfig) return ''
  return `${String(sortConfig.key)}:${sortConfig.direction}`
}

function AdminCatalogSortSelect({
  sortConfig,
  onChange,
  id,
}: {
  sortConfig: SortConfig | null
  onChange: (config: SortConfig | null) => void
  id: string
}): ReactElement {
  return (
    <div className="w-full min-w-0 lg:flex-1">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400" htmlFor={id}>
        Сортировка
      </label>
      <select
        id={id}
        className="form-input mt-1.5 w-full text-sm"
        value={mobileSortSelectValue(sortConfig)}
        onChange={(e) => {
          const opt = MOBILE_SORT_OPTIONS.find((o) => o.value === e.target.value)
          onChange(opt?.config ?? null)
        }}
      >
        {MOBILE_SORT_OPTIONS.map((o) => (
          <option key={o.value || 'default'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ProductCardRow({
  product,
  selectedCategory,
  canReorder,
  isSaving,
  isDeleting,
  isTogglingDraft,
  editing,
  setEditing,
  onStartEditPrice,
  onStartEditQuantity,
  onStartEditSku,
  onStartEditBrand,
  onDelete,
  saveInline,
  saveInlineSku,
  saveInlineBrand,
  onToggleDraft,
}: ProductRowProps) {
  const router = useRouter()
  const base = useAdminBasePath()
  const editProductHref = selectedCategory
    ? `/${base}/products/${product.id}/edit?categoryId=${encodeURIComponent(selectedCategory)}`
    : `/${base}/products/${product.id}/edit`
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: !canReorder })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging) return
    const target = e.target as HTMLElement
    if (target.closest('a, button, input, textarea, select')) return
    if (target.closest('[data-prevent-row-nav]')) return
    router.push(editProductHref)
  }

  const categoryLine = getCategoryLine(product)
  const hasDiscount = typeof product.priceOld === 'number' && product.priceOld > product.price

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full min-w-0 ${
        isDragging ? 'opacity-60 ring-2 ring-action-blue/40' : ''
      }`}
    >
      {/* Desktop (table-like) */}
        <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            router.push(editProductHref)
          }
        }}
          className="hidden cursor-pointer lg:grid lg:grid-cols-[2rem_10fr_35fr_15fr_15fr_10fr_10fr_5fr_3rem] lg:items-center lg:gap-3 lg:px-3 lg:py-3 lg:hover:bg-gray-50 lg:dark:hover:bg-gray-800 lg:border-b lg:border-gray-200 lg:bg-white lg:dark:bg-gray-900 dark:lg:border-gray-800"
      >
        <div className="flex w-full items-center justify-center">
          {canReorder ? (
            <button
              type="button"
              className="touch-none rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
              {...listeners}
              {...attributes}
              aria-label="Перетащить для изменения порядка"
              onClick={(e) => e.stopPropagation()}
            >
              <Drag className="h-5 w-5" />
            </button>
          ) : (
            <span className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <div className="relative flex min-w-0 items-center justify-start">
          {hasDiscount && (
            <div className="absolute left-[-16px] top-1/2 z-10 -translate-y-1/2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              -%
            </div>
          )}
          <div className="product-thumb flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
            {product.photo ? (
              <img src={product.photo} alt="" width={36} height={36} className="h-full w-full object-cover" />
            ) : (
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 14m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p
            className="font-medium text-gray-900 dark:text-gray-100 overflow-hidden wrap-break-word [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]"
          >
            {product.title}
          </p>
        </div>

        <div className="min-w-0 w-full">
          {editing?.productId === product.id && editing?.field === 'sku' ? (
            <input
              type="text"
              data-prevent-row-nav
              value={editing.value}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditing((p) => (p ? { ...p, value: e.target.value } : null))}
              onBlur={() => {
                const raw = editing?.value ?? ''
                const nextSku = raw.trim() === '' ? null : raw.trim()
                void (async () => {
                  try {
                    await saveInlineSku(product.id, nextSku)
                  } finally {
                    setEditing(null)
                  }
                })()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const raw = editing?.value ?? ''
                  const nextSku = raw.trim() === '' ? null : raw.trim()
                  void (async () => {
                    try {
                      await saveInlineSku(product.id, nextSku)
                    } finally {
                      setEditing(null)
                    }
                  })()
                }
                if (e.key === 'Escape') setEditing(null)
              }}
              className="form-input box-border w-full py-1.5 text-sm text-gray-900 dark:text-gray-100"
              autoFocus
            />
          ) : (
            <button
              type="button"
              data-prevent-row-nav
              className="w-full rounded px-1 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation()
                onStartEditSku()
              }}
              aria-label="Редактировать SKU"
            >
              {isSaving ? (
                <span className="text-gray-400">…</span>
              ) : (
                <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                  {product.sku || '—'}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex min-w-0 w-full items-center justify-center">
          {editing?.productId === product.id && editing?.field === 'price' ? (
            <input
              type="number"
              min={0}
              step={0.01}
              data-prevent-row-nav
              value={editing.value}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditing((p) => (p ? { ...p, value: e.target.value } : null))}
              onBlur={() => {
                if (editing) void saveInline(product.id, 'price', editing.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editing) void saveInline(product.id, 'price', editing.value)
                if (e.key === 'Escape') setEditing(null)
              }}
              className="form-input box-border w-full max-w-26 py-1.5 text-center text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              autoFocus
            />
          ) : isSaving ? (
            <span className="text-gray-400">…</span>
          ) : (
            <button
              type="button"
              data-prevent-row-nav
              className="w-full rounded px-1 text-center tabular-nums hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation()
                onStartEditPrice()
              }}
            >
              <span suppressHydrationWarning className="tabular-nums">
                {`${Number(product.price).toLocaleString('ru-RU')}\u202f₽`}
              </span>
            </button>
          )}
        </div>

        <div className="flex min-w-0 w-full items-center justify-center">
          {editing?.productId === product.id && editing?.field === 'quantity' ? (
            <input
              type="number"
              min={0}
              data-prevent-row-nav
              value={editing.value}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setEditing((p) => (p ? { ...p, value: e.target.value } : null))}
              onBlur={() => {
                if (editing) void saveInline(product.id, 'quantity', editing.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editing) void saveInline(product.id, 'quantity', editing.value)
                if (e.key === 'Escape') setEditing(null)
              }}
              className="form-input box-border w-full max-w-20 py-1.5 text-center text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              autoFocus
            />
          ) : isSaving ? (
            <span className="text-gray-400">…</span>
          ) : (
            <button
              type="button"
              data-prevent-row-nav
              className="w-full rounded px-1 text-center tabular-nums hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation()
                onStartEditQuantity()
              }}
            >
              <span suppressHydrationWarning className="tabular-nums">
                {formatQuantity(product.quantity)}
              </span>
            </button>
          )}
        </div>

        <div className="min-w-0 w-full">
          {editing?.productId === product.id && editing?.field === 'brand' ? (
            <select
              data-prevent-row-nav
              value={editing.value === 'sprint-power' ? 'sprint-power' : 'inner'}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const nextBrand = e.target.value === 'sprint-power' ? 'sprint-power' : 'inner'
                void (async () => {
                  try {
                    await saveInlineBrand(product.id, nextBrand)
                  } finally {
                    setEditing(null)
                  }
                })()
              }}
              onBlur={() => setEditing(null)}
              className="form-input box-border w-full py-1.5 text-sm text-gray-900 dark:text-gray-100"
              autoFocus
            >
              <option value="inner">Inner Health</option>
              <option value="sprint-power">Sprint Power</option>
            </select>
          ) : (
            <button
              type="button"
              data-prevent-row-nav
              className="w-full rounded px-1 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation()
                onStartEditBrand()
              }}
              aria-label="Редактировать бренд"
              title={product.brand ?? ''}
            >
              {isSaving ? (
                <span className="text-gray-400">…</span>
              ) : (
                <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                  {product.brand === 'sprint-power' ? 'Sprint Power' : 'Inner Health'}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex min-w-0 w-full items-center justify-center">
          <button
            type="button"
            data-prevent-row-nav
            disabled={isTogglingDraft}
            onClick={(e) => {
              e.stopPropagation()
              onToggleDraft(product.id, !product.isDraft)
            }}
            className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
            aria-label={product.isDraft ? 'Показать товар на сайте' : 'Скрыть товар с сайта'}
            style={{
              backgroundColor: product.isDraft ? '#d1d5db' : 'var(--color-action-blue)',
            }}
          >
            <span
              className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
              style={{
                transform: product.isDraft ? 'translateX(2px)' : 'translateX(22px)',
              }}
            />
          </button>
        </div>

        <div className="flex min-w-0 w-full items-center justify-end">
          <button
            type="button"
            data-prevent-row-nav
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
            aria-label="Удалить"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(product)
            }}
          >
            {isDeleting ? <span className="text-xs">…</span> : <Trash className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile (card) */}
      <div className="lg:hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              router.push(editProductHref)
            }
          }}
          className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-action-blue/50"
        >
          <div className="flex gap-3">
            {canReorder && (
              <button
                type="button"
                className="touch-none shrink-0 self-start rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                {...listeners}
                {...attributes}
                aria-label="Перетащить для изменения порядка"
                onClick={(e) => e.stopPropagation()}
              >
                <Drag className="h-5 w-5" />
              </button>
            )}
            <div className="relative flex items-center justify-start">
              {hasDiscount && (
                <div className="absolute left-[-20px] top-1/2 z-10 -translate-y-1/2 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
                  -%
                </div>
              )}
              <div className="product-thumb flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                {product.photo ? (
                  <img src={product.photo} alt="" width={48} height={48} className="h-full w-full object-cover" />
                ) : (
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 14m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">{product.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">SKU: {product.sku || '—'}</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                <span className="text-gray-500">Раздел:</span> {categoryLine}
              </p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Сайт</span>
                <button
                  type="button"
                  data-prevent-row-nav
                  disabled={isTogglingDraft}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleDraft(product.id, !product.isDraft)
                  }}
                  className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
                  aria-label={
                    product.isDraft ? 'Показать товар на сайте (сейчас скрыт)' : 'Скрыть товар с сайта (сейчас показан)'
                  }
                  style={{
                    backgroundColor: product.isDraft ? '#d1d5db' : 'var(--color-action-blue)',
                  }}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                    style={{
                      transform: product.isDraft ? 'translateX(2px)' : 'translateX(22px)',
                    }}
                  />
                </button>
              </div>
              <span className="text-xs text-gray-500" suppressHydrationWarning>
                {new Date(product.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <dt className="text-gray-500">Цена</dt>
            <dd className="text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">
              {editing?.productId === product.id && editing?.field === 'price' ? (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  data-prevent-row-nav
                  value={editing.value}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditing((p) => (p ? { ...p, value: e.target.value } : null))}
                  onBlur={() => {
                    if (editing) void saveInline(product.id, 'price', editing.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editing) void saveInline(product.id, 'price', editing.value)
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  className="form-input box-border w-full max-w-36 py-1.5 text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  autoFocus
                />
              ) : isSaving ? (
                <span className="text-gray-400">…</span>
              ) : (
                <button
                  type="button"
                  data-prevent-row-nav
                  className="rounded px-1 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartEditPrice()
                  }}
                >
                  <span suppressHydrationWarning>{`${Number(product.price).toLocaleString('ru-RU')}\u202f₽`}</span>
                </button>
              )}
            </dd>
            <dt className="text-gray-500">Остаток</dt>
            <dd className="text-right tabular-nums text-gray-700 dark:text-gray-300">
              {editing?.productId === product.id && editing?.field === 'quantity' ? (
                <input
                  type="number"
                  min={0}
                  data-prevent-row-nav
                  value={editing.value}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditing((p) => (p ? { ...p, value: e.target.value } : null))}
                  onBlur={() => {
                    if (editing) void saveInline(product.id, 'quantity', editing.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editing) void saveInline(product.id, 'quantity', editing.value)
                    if (e.key === 'Escape') setEditing(null)
                  }}
                  className="form-input box-border ml-auto block w-full max-w-24 py-1.5 text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  autoFocus
                />
              ) : isSaving ? (
                <span className="text-gray-400">…</span>
              ) : (
                <button
                  type="button"
                  data-prevent-row-nav
                  className="rounded px-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartEditQuantity()
                  }}
                >
                  <span suppressHydrationWarning>{formatQuantity(product.quantity)}</span>
                </button>
              )}
            </dd>
          </dl>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <Link
            href={editProductHref}
            className="inline-flex flex-1 min-w-24 items-center justify-center rounded-full bg-highlight-blue px-3 py-2 text-sm font-medium text-(--color-text) hover:opacity-90"
            onClick={(e) => e.stopPropagation()}
          >
            Редактировать
          </Link>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            className="min-w-24 flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(product)
            }}
          >
            {isDeleting ? '…' : 'Удалить'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProductTable({ products, onRefresh, selectedCategory }: ProductTableProps) {
  const [filteredProducts, setFilteredProducts] = useState<ProductWithCategories[]>(products)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [togglingDraftId, setTogglingDraftId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const canReorder = selectedCategory !== null && selectedCategory !== NO_CATEGORY_ID
  /** Перетаскивание только без поиска — иначе порядок в state расходится со списком. */
  const dragEnabled = canReorder && !searchTerm.trim()

  const saveInline = async (productId: string, field: 'price' | 'quantity', value: string) => {
    const num = field === 'price' ? parseFloat(value) : (value === '' ? 0 : parseInt(value, 10))
    if (field === 'price' && (Number.isNaN(num) || num < 0)) return
    if (field === 'quantity' && (Number.isNaN(num) || num < 0)) return
    setEditing(null)
    setSavingId(productId)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: productId, [field]: num }),
      })
      if (!res.ok) throw new Error(await res.text())
      onRefresh()
    } catch (e) {
      console.error(e)
      alert('Не удалось сохранить')
    } finally {
      setSavingId(null)
    }
  }

  const saveInlineSku = async (productId: string, nextSku: string | null) => {
    setEditing(null)
    setSavingId(productId)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: productId, sku: nextSku }),
      })
      if (!res.ok) throw new Error(await res.text())
      onRefresh()
    } catch (e) {
      console.error(e)
      alert('Не удалось сохранить SKU')
    } finally {
      setSavingId(null)
    }
  }

  const saveInlineBrand = async (productId: string, nextBrand: 'inner' | 'sprint-power') => {
    setEditing(null)
    setSavingId(productId)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: productId, brand: nextBrand }),
      })
      if (!res.ok) throw new Error(await res.text())
      onRefresh()
    } catch (e) {
      console.error(e)
      alert('Не удалось сохранить бренд')
    } finally {
      setSavingId(null)
    }
  }

  const toggleDraft = async (productId: string, nextIsDraft: boolean) => {
    setTogglingDraftId(productId)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: productId, isDraft: nextIsDraft }),
      })
      if (!res.ok) throw new Error(await res.text())
      onRefresh()
    } catch (e) {
      console.error(e)
      alert('Не удалось обновить видимость товара')
    } finally {
      setTogglingDraftId(null)
    }
  }

  useEffect(() => {
    setFilteredProducts(products)
  }, [products])

  useEffect(() => {
    if (selectedCategory === NO_CATEGORY_ID) {
      setFilteredProducts(products.filter((p) => !p.categories?.length))
    } else if (selectedCategory) {
      const inCategory = products.filter((p) =>
        p.categories?.some((c) => c.categoryId === selectedCategory)
      )

      const withOrder = [...inCategory].sort((a, b) => {
        const aLink = a.categories?.find((c) => c.categoryId === selectedCategory)
        const bLink = b.categories?.find((c) => c.categoryId === selectedCategory)
        const aOrder = aLink?.sortOrder ?? 0
        const bOrder = bLink?.sortOrder ?? 0
        if (aOrder === bOrder) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return aOrder - bOrder
      })

      setFilteredProducts(withOrder)
    } else {
      setFilteredProducts(products)
    }
  }, [selectedCategory, products])

  const getFirstCategoryTitle = (product: ProductWithCategories): string | null => {
    const title = product.categories?.map((c) => c.category?.title).find(Boolean)
    if (!title) return null
    const trimmed = title.trim()
    return trimmed ? trimmed : null
  }

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts]
    if (!sortConfig) return list

    list.sort((a, b) => {
      if (sortConfig.key === 'categoryTitle') {
        const av = getFirstCategoryTitle(a)
        const bv = getFirstCategoryTitle(b)
        // Put empties last (user choice)
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = av.localeCompare(bv, 'ru-RU', { sensitivity: 'base' })
        return sortConfig.direction === 'asc' ? cmp : -cmp
      }

      if (sortConfig.key === 'title') {
        const cmp = a.title.localeCompare(b.title, 'ru-RU', { sensitivity: 'base' })
        return sortConfig.direction === 'asc' ? cmp : -cmp
      }

      const av = a[sortConfig.key]
      const bv = b[sortConfig.key]
      if (av == null && bv == null) return 0
      if (av == null) return sortConfig.direction === 'asc' ? 1 : -1
      if (bv == null) return sortConfig.direction === 'asc' ? -1 : 1
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filteredProducts, sortConfig])

  const filteredAndSorted = sortedProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDelete = async (product: Product) => {
    if (!confirm(`Удалить товар «${product.title}»?`)) return
    setDeletingId(product.id)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id }),
        credentials: 'include',
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error || 'Не удалось удалить товар')
      }
      onRefresh()
    } catch (e) {
      console.error(e)
      const message = e instanceof Error ? e.message : 'Не удалось удалить товар'
      alert(message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!dragEnabled || !selectedCategory) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const current = [...filteredAndSorted]
    const fromIndex = current.findIndex((p) => p.id === active.id)
    const toIndex = current.findIndex((p) => p.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = [...current]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    setFilteredProducts((prev) => {
      const inReorder = new Set(reordered.map((p) => p.id))
      const rest = prev.filter((p) => !inReorder.has(p.id))
      return [...reordered, ...rest]
    })

    const payloadItems: ReorderPayloadItem[] = reordered.map((p, index) => ({
      productId: p.id,
      sortOrder: index,
    }))

    try {
      const res = await fetch('/api/admin/products/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          categoryId: selectedCategory,
          items: payloadItems,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('Failed to reorder products', text)
        alert('Не удалось сохранить порядок товаров')
      } else {
        onRefresh()
      }
    } catch (err) {
      console.error('Error reordering products', err)
      alert('Не удалось сохранить порядок товаров')
    }
  }

  return (
    <div className="admin-card w-full min-w-0">
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative min-w-0 w-full lg:flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Поиск по названию или SKU..."
              className="form-input w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <AdminCatalogSortSelect
            id="admin-catalog-sort"
            sortConfig={sortConfig}
            onChange={setSortConfig}
          />
          <Button variant="secondary" size="sm" className="shrink-0 self-stretch sm:self-auto" onClick={onRefresh}>
            Обновить
          </Button>
        </div>
      </div>

      <div className="admin-table-wrap w-full min-w-0 p-3 sm:p-4">
        <div className="hidden lg:grid lg:grid-cols-[2rem_10fr_35fr_15fr_15fr_10fr_10fr_5fr_3rem] lg:gap-3 lg:px-3 lg:py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:lg:border-gray-800">
          <div />
          <div className="min-w-0">Фото</div>
          <div className="min-w-0">Заголовок</div>
          <div className="min-w-0">Артикул</div>
          <div className="flex min-w-0 w-full items-center justify-center">Цена</div>
          <div className="flex min-w-0 w-full items-center justify-center">Кол-во</div>
          <div className="min-w-0">Бренд</div>
          <div className="min-w-0">Видимость</div>
          <div className="min-w-0 text-right"> </div>
        </div>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredAndSorted.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="flex w-full min-w-0 flex-col gap-3 lg:gap-0">
              {filteredAndSorted.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-500 dark:border-gray-700">
                  <span className="text-4xl opacity-50">📦</span>
                  <p className="mt-2 text-sm font-medium">Нет товаров</p>
                  <p className="mt-1 text-xs">
                    {searchTerm
                      ? 'Попробуйте изменить поиск или фильтр по категории'
                      : 'Добавьте товар или импортируйте из CSV'}
                  </p>
                </div>
              ) : (
                filteredAndSorted.map((product) => (
                  <ProductCardRow
                    key={product.id}
                    product={product}
                    selectedCategory={selectedCategory}
                    canReorder={dragEnabled}
                    isSaving={savingId === product.id}
                    isDeleting={deletingId === product.id}
                    isTogglingDraft={togglingDraftId === product.id}
                    editing={editing}
                    setEditing={setEditing}
                    onStartEditPrice={() =>
                      setEditing({
                        productId: product.id,
                        field: 'price',
                        value: String(product.price),
                      })
                    }
                    onStartEditQuantity={() =>
                      setEditing({
                        productId: product.id,
                        field: 'quantity',
                        value: String(product.quantity ?? ''),
                      })
                    }
                    onStartEditSku={() =>
                      setEditing({
                        productId: product.id,
                        field: 'sku',
                        value: product.sku ?? '',
                      })
                    }
                    onStartEditBrand={() =>
                      setEditing({
                        productId: product.id,
                        field: 'brand',
                        value: product.brand === 'sprint-power' ? 'sprint-power' : 'inner',
                      })
                    }
                    onDelete={handleDelete}
                    saveInline={saveInline}
                    saveInlineSku={saveInlineSku}
                    saveInlineBrand={saveInlineBrand}
                    onToggleDraft={toggleDraft}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

