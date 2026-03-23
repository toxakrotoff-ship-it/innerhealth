'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AdminCollapsible } from '@/app/admin/components/admin-collapsible'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import Button from '@/components/ui/button'
import { ProductTable } from './components/ProductTable'
import { Product } from '@prisma/client'
import { CategorySidebar } from './components/CategorySidebar'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'
import { NO_CATEGORY_ID } from './constants'

interface ProductWithCategories extends Product {
  categories?: { categoryId: string }[]
}

export default function AdminCatalogPage() {
  const base = useAdminBasePath()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<ProductWithCategories[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    const categoryId = searchParams.get('categoryId')
    return categoryId && categoryId.trim() ? categoryId : null
  })
  const [categoriesPanelOpen, setCategoriesPanelOpen] = useState(false)
  const [categoriesEverOpened, setCategoriesEverOpened] = useState(false)

  const filterSummary =
    selectedCategory === null
      ? 'Все товары'
      : selectedCategory === NO_CATEGORY_ID
        ? 'Без раздела'
        : 'Выбранный раздел'

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

  useEffect(() => {
    if (categoriesPanelOpen) setCategoriesEverOpened(true)
  }, [categoriesPanelOpen])

  useEffect(() => {
    const categoryIdFromUrl = searchParams.get('categoryId')
    const normalizedCategoryId = categoryIdFromUrl && categoryIdFromUrl.trim() ? categoryIdFromUrl : null
    setSelectedCategory((current) => (current === normalizedCategoryId ? current : normalizedCategoryId))
  }, [searchParams])

  const handleCategorySelect = (categoryId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (categoryId) params.set('categoryId', categoryId)
    else params.delete('categoryId')
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    setSelectedCategory(categoryId)
  }

  if (loading) {
    return (
      <div>
        <div className="admin-page-header">
          <h1>Каталог товаров</h1>
          <p>Управление товарами магазина</p>
        </div>
        <div className="space-y-4">
          <div className="admin-card h-12 animate-pulse rounded-xl" />
          <div className="admin-card h-14 animate-pulse rounded-xl" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="admin-card h-16 animate-pulse rounded-xl" />
          ))}
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
        <Link href={`/${base}/products/new`} className="admin-btn-add">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить товар
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setCategoriesPanelOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            aria-expanded={categoriesPanelOpen}
            aria-controls="admin-catalog-categories-panel"
          >
            <span>Категории</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${categoriesPanelOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Сейчас: <span className="font-medium text-gray-700 dark:text-gray-200">{filterSummary}</span>
          </span>
        </div>

        <AdminCollapsible open={categoriesPanelOpen} className="max-w-2xl">
          {categoriesEverOpened ? (
            <div id="admin-catalog-categories-panel">
              <CategorySidebar
                selectedCategory={selectedCategory}
                onCategorySelect={(id) => {
                  handleCategorySelect(id)
                  setCategoriesPanelOpen(false)
                }}
                products={products}
              />
            </div>
          ) : null}
        </AdminCollapsible>

        <ProductTable
          products={products}
          onRefresh={fetchProducts}
          selectedCategory={selectedCategory}
        />
      </div>
    </div>
  )
}
