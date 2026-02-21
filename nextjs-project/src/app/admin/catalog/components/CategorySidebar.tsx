'use client'

import { useState, useEffect } from 'react'
import { Category, getCategoriesWithCounts } from '../actions'

interface CategorySidebarProps {
  selectedCategory: string | null
  onCategorySelect: (categoryId: string | null) => void
}

export function CategorySidebar({ selectedCategory, onCategorySelect }: CategorySidebarProps) {
  const [categories, setCategories] = useState<(Category & { productCount: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [totalProducts, setTotalProducts] = useState(0)

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
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategorySelect(cat.id)}
            className={`category-sidebar-item w-full ${selectedCategory === cat.id ? 'category-sidebar-item-active' : ''}`}
          >
            <span className="truncate">{cat.title}</span>
            <span className="category-sidebar-badge category-sidebar-badge-muted">{cat.productCount}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
