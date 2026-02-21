'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/button'
import { ProductTable } from './components/ProductTable'
import { Product } from '@prisma/client'
import { CategorySidebar } from './components/CategorySidebar'

interface ProductWithCategories extends Product {
  categories?: { categoryId: string }[]
}

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<ProductWithCategories[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/products', { credentials: 'include' })
      if (!response.ok) throw new Error(`Ошибка: ${response.status}`)
      const data = await response.json()
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setProducts(data.items && Array.isArray(data.items) ? data.items : [data])
      } else if (Array.isArray(data)) {
        setProducts(data)
      } else {
        setProducts([])
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory])

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
  }

  if (loading) {
    return (
      <div>
        <div className="admin-page-header">
          <h1>Каталог товаров</h1>
          <p>Управление товарами магазина</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="admin-card h-64 animate-pulse rounded-xl" />
          <div className="lg:col-span-3 space-y-4">
            <div className="admin-card h-14 animate-pulse rounded-xl" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="admin-card h-16 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="admin-page-header">
          <h1>Каталог товаров</h1>
          <p>Управление товарами магазина</p>
        </div>
        <div className="admin-card p-6">
          <div className="alert error flex items-center gap-3">
            <span className="text-destructive font-medium">Ошибка</span>
            <span className="text-sm">{error}</span>
            <Button variant="secondary" size="sm" onClick={fetchProducts}>
              Повторить
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="admin-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1>Каталог товаров</h1>
          <p>Управление товарами магазина</p>
        </div>
        <Link href="/admin/products/new" className="admin-btn-add">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить товар
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <CategorySidebar
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
            products={products}
          />
        </div>
        <div className="lg:col-span-3">
          <ProductTable
            products={products}
            onRefresh={fetchProducts}
            selectedCategory={selectedCategory}
          />
        </div>
      </div>
    </div>
  )
}
