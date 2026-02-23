'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Category, getCategoriesWithCounts } from '../actions'
import { NO_CATEGORY_ID } from '../constants'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'

type ProductWithCategories = {
  id: string
  title: string
  categories?: { categoryId: string }[]
}

interface CategorySidebarProps {
  /** null = все, NO_CATEGORY_ID = без раздела, иначе id категории */
  selectedCategory: string | null
  onCategorySelect: (categoryId: string | null) => void
  /** Список товаров для отображения под каждой категорией */
  products?: ProductWithCategories[]
}

export function CategorySidebar({ selectedCategory, onCategorySelect, products = [] }: CategorySidebarProps) {
  const base = useAdminBasePath()
  const [categories, setCategories] = useState<(Category & { productCount: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [totalProducts, setTotalProducts] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (categoryId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCategoriesWithCounts()
        setCategories(data)
        setTotalProducts(data.reduce((s, c) => s + c.productCount, 0))
      } catch {
        setCategories([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="admin-card p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/80">
        <h3 className="text-sm font-semibold text-gray-700">Разделы каталога</h3>
      </div>
      <div className="p-2">
        <button
          type="button"
          onClick={() => onCategorySelect(null)}
          className={`category-sidebar-item w-full ${selectedCategory === null ? 'category-sidebar-item-active' : ''}`}
        >
          <span>Все товары</span>
          <span className="category-sidebar-badge">{totalProducts}</span>
        </button>
        <button
          type="button"
          onClick={() => onCategorySelect(NO_CATEGORY_ID)}
          className={`category-sidebar-item w-full ${selectedCategory === NO_CATEGORY_ID ? 'category-sidebar-item-active' : ''}`}
        >
          <span className="truncate">Без раздела</span>
          <span className="category-sidebar-badge category-sidebar-badge-muted">
            {products.filter((p) => !p.categories?.length).length}
          </span>
        </button>
        {products.filter((p) => !p.categories?.length).length > 0 && (
          <div className="rounded-lg overflow-hidden">
            {expandedIds.has(NO_CATEGORY_ID) ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleExpanded(NO_CATEGORY_ID)}
                  className="ml-3 mt-0.5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <span className="inline-block w-4 text-left" aria-hidden>▼</span>
                  Скрыть товары
                </button>
                <ul className="ml-3 pl-2 border-l border-gray-200 text-xs text-gray-500 space-y-0.5 py-1">
                  {products
                    .filter((p) => !p.categories?.length)
                    .slice(0, 8)
                    .map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/${base}/products/${p.id}/edit`}
                          className="truncate block hover:text-gray-800 hover:underline"
                          title={p.title}
                        >
                          {p.title}
                        </Link>
                      </li>
                    ))}
                  {products.filter((p) => !p.categories?.length).length > 8 && (
                    <li className="text-gray-400">
                      и ещё {products.filter((p) => !p.categories?.length).length - 8}
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <button
                type="button"
                onClick={() => toggleExpanded(NO_CATEGORY_ID)}
                className="ml-3 mt-0.5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <span className="inline-block w-4 text-left" aria-hidden>▶</span>
                Показать товары ({products.filter((p) => !p.categories?.length).length})
              </button>
            )}
          </div>
        )}
        {categories.map((cat) => {
          const productsInCategory = products.filter((p) =>
            p.categories?.some((c) => c.categoryId === cat.id)
          )
          return (
            <div key={cat.id} className="rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => onCategorySelect(cat.id)}
                className={`category-sidebar-item w-full ${selectedCategory === cat.id ? 'category-sidebar-item-active' : ''}`}
              >
                <span className="truncate">{cat.title}</span>
                <span className="category-sidebar-badge category-sidebar-badge-muted">{cat.productCount}</span>
              </button>
              {productsInCategory.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(cat.id)
                    }}
                    className="ml-3 mt-0.5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {expandedIds.has(cat.id) ? (
                      <>
                        <span className="inline-block w-4 text-left" aria-hidden>▼</span>
                        Скрыть товары
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-4 text-left" aria-hidden>▶</span>
                        Показать товары ({productsInCategory.length})
                      </>
                    )}
                  </button>
                  {expandedIds.has(cat.id) && (
                    <ul className="ml-3 pl-2 border-l border-gray-200 text-xs text-gray-500 space-y-0.5 py-1">
                      {productsInCategory.slice(0, 8).map((p) => (
                        <li key={p.id} className="truncate">
                          <Link
                            href={`/${base}/products/${p.id}/edit`}
                            className="block truncate hover:text-gray-800 hover:underline"
                            title={p.title}
                          >
                            {p.title}
                          </Link>
                        </li>
                      ))}
                      {productsInCategory.length > 8 && (
                        <li className="text-gray-400">и ещё {productsInCategory.length - 8}</li>
                      )}
                    </ul>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
