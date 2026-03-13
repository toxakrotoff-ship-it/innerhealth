'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
import { GripVertical } from 'lucide-react'
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
  field: 'price' | 'quantity'
  value: string
}

interface SortConfig {
  key: keyof Product
  direction: 'asc' | 'desc'
}

interface ReorderPayloadItem {
  productId: string
  sortOrder: number
}

interface ProductRowProps {
  product: ProductWithCategories
  canReorder: boolean
  isSaving: boolean
  isDeleting: boolean
  editing: EditingState | null
  setEditing: (value: EditingState | null | ((prev: EditingState | null) => EditingState | null)) => void
  onStartEditPrice: () => void
  onStartEditQuantity: () => void
  onDelete: (product: Product) => void
  saveInline: (productId: string, field: 'price' | 'quantity', value: string) => Promise<void>
}

function ProductRow({
  product,
  canReorder,
  isSaving,
  isDeleting,
  editing,
  setEditing,
  onStartEditPrice,
  onStartEditQuantity,
  onDelete,
  saveInline,
}: ProductRowProps) {
  const base = useAdminBasePath()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: !canReorder })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50 bg-gray-50' : undefined}
    >
      <td className="max-w-[280px]">
        <div className="flex items-center gap-3 min-w-0">
          {canReorder && (
            <button
              type="button"
              className="touch-none p-1 rounded text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing focus:outline-none"
              {...listeners}
              {...attributes}
              aria-label="Перетащить для изменения порядка"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className="product-thumb rounded-lg bg-gray-100 flex items-center justify-center shrink-0 flex-none">
            {product.photo ? (
              <img
                src={product.photo}
                alt=""
                width={40}
                height={40}
              />
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 14m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{product.title}</p>
            <p className="text-xs text-gray-500">SKU: {product.sku || '—'}</p>
          </div>
        </div>
      </td>
      <td className="text-gray-600 text-sm">
        {product.categories?.length
          ? product.categories
              .map((pc) => pc.category?.title)
              .filter(Boolean)
              .join(', ') || '—'
          : '—'}
      </td>
      <td
        className="font-medium text-gray-900 align-top"
        onDoubleClick={onStartEditPrice}
        title="Двойной клик — изменить"
      >
        {editing?.productId === product.id && editing?.field === 'price' ? (
          <input
            type="number"
            min={0}
            step={0.01}
            value={editing.value}
            onChange={(e) => setEditing((p) => (p ? { ...p, value: e.target.value } : null))}
            onBlur={() => {
              if (editing) void saveInline(product.id, 'price', editing.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editing) void saveInline(product.id, 'price', editing.value)
              }
              if (e.key === 'Escape') setEditing(null)
            }}
            className="form-input w-24 py-1 text-sm"
            autoFocus
          />
        ) : isSaving ? (
          <span className="text-gray-400">…</span>
        ) : (
          <span suppressHydrationWarning>{Number(product.price).toLocaleString('ru-RU')} ₽</span>
        )}
      </td>
      <td
        className="text-gray-600 align-top"
        onDoubleClick={onStartEditQuantity}
        title="Двойной клик — изменить"
      >
        {editing?.productId === product.id && editing?.field === 'quantity' ? (
          <input
            type="number"
            min={0}
            value={editing.value}
            onChange={(e) => setEditing((p) => (p ? { ...p, value: e.target.value } : null))}
            onBlur={() => {
              if (editing) void saveInline(product.id, 'quantity', editing.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editing) void saveInline(product.id, 'quantity', editing.value)
              }
              if (e.key === 'Escape') setEditing(null)
            }}
            className="form-input w-20 py-1 text-sm"
            autoFocus
          />
        ) : isSaving ? (
          <span className="text-gray-400">…</span>
        ) : (
          <span suppressHydrationWarning>{product.quantity ?? '—'}</span>
        )}
      </td>
      <td className="text-gray-600" suppressHydrationWarning>
        {new Date(product.createdAt).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </td>
      <td>
        <div className="flex items-center gap-3">
          <Link
            href={`/${useAdminBasePath()}/products/${product.id}/edit`}
            className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium bg-highlight-blue text-(--color-text) hover:opacity-90 transition-opacity min-h-[32px]"
          >
            Ред.
          </Link>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={() => onDelete(product)}
          >
            {isDeleting ? '…' : 'Удалить'}
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function ProductTable({ products, onRefresh, selectedCategory }: ProductTableProps) {
  const [filteredProducts, setFilteredProducts] = useState<ProductWithCategories[]>(products)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const canReorder = selectedCategory !== null && selectedCategory !== NO_CATEGORY_ID

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

  const handleSort = (key: keyof Product) => {
    const direction =
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    setSortConfig({ key, direction })
  }

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts]
    if (!sortConfig) return list

    list.sort((a, b) => {
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
      if (!res.ok) throw new Error(await res.text())
      onRefresh()
    } catch (e) {
      console.error(e)
      alert('Не удалось удалить товар')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canReorder || !selectedCategory) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const current = [...filteredProducts]
    const fromIndex = current.findIndex((p) => p.id === active.id)
    const toIndex = current.findIndex((p) => p.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = [...current]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    setFilteredProducts(reordered)

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
    <div className="admin-card">
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Поиск по названию или SKU..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          Обновить
        </Button>
      </div>

      <div className="admin-table-wrap">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filteredAndSorted.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th className="min-w-[140px]">Раздел</th>
                  <th
                    className="cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    Цена
                    {sortConfig?.key === 'price' && (
                      <span className="ml-1 text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="min-w-[80px]">Остаток</th>
                  <th
                    className="cursor-pointer select-none hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    Дата
                    {sortConfig?.key === 'createdAt' && (
                      <span className="ml-1 text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th className="w-[140px]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="inline-flex flex-col items-center gap-3 text-gray-500">
                        <span className="text-4xl opacity-50">📦</span>
                        <p className="text-sm font-medium">Нет товаров</p>
                        <p className="text-xs max-w-[240px]">
                          {searchTerm
                            ? 'Попробуйте изменить поиск или фильтр по категории'
                            : 'Добавьте товар или импортируйте из CSV'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      canReorder={canReorder}
                      isSaving={savingId === product.id}
                      isDeleting={deletingId === product.id}
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
                      onDelete={handleDelete}
                      saveInline={saveInline}
                    />
                  ))
                )}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

