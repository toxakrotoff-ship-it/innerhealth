'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/button'
import { Product } from '@prisma/client'

type ProductWithCategories = Product & {
  categories?: { categoryId: string }[]
}

interface ProductTableProps {
  products: ProductWithCategories[]
  onRefresh: () => void
  selectedCategory: string | null
}

export function ProductTable({ products, onRefresh, selectedCategory }: ProductTableProps) {
  const [filteredProducts, setFilteredProducts] = useState<ProductWithCategories[]>(products)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setFilteredProducts(products)
  }, [products])

  useEffect(() => {
    if (selectedCategory) {
      const filtered = products.filter((p) =>
        p.categories?.some((c) => c.categoryId === selectedCategory)
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts(products)
    }
  }, [selectedCategory, products])

  const handleSort = (key: keyof Product) => {
    const direction =
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    setSortConfig({ key, direction })
  }

  const sortedProducts = [...filteredProducts]
  if (sortConfig) {
    sortedProducts.sort((a, b) => {
      const av = a[sortConfig.key]
      const bv = b[sortConfig.key]
      if (av == null && bv == null) return 0
      if (av == null) return sortConfig.direction === 'asc' ? 1 : -1
      if (bv == null) return sortConfig.direction === 'asc' ? -1 : 1
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }

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
        <table className="admin-table">
          <thead>
            <tr>
              <th>Товар</th>
              <th
                className="cursor-pointer select-none hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                Цена
                {sortConfig?.key === 'price' && (
                  <span className="ml-1 text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
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
                <td colSpan={4} className="p-12 text-center">
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
                <tr key={product.id}>
                  <td className="max-w-[280px]">
                    <div className="flex items-center gap-3 min-w-0">
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
                  <td className="font-medium text-gray-900" suppressHydrationWarning>{Number(product.price).toLocaleString('ru-RU')} ₽</td>
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
                        href={`/admin/products/${product.id}/edit`}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium bg-[var(--color-highlight-blue)] text-[var(--color-text)] hover:opacity-90 transition-opacity min-h-[32px]"
                      >
                        Ред.
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === product.id}
                        onClick={() => handleDelete(product)}
                      >
                        {deletingId === product.id ? '…' : 'Удалить'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
