'use client'

import { useEffect, useState } from 'react'
import { useWishlistStore } from '@/store/wishlist-store'
import { ProductCard } from '@/components/site/product-card'

interface WishlistProduct {
  id: string
  title: string
  price: number
  priceOld: number | null
  photo: string | null
  slug: string | null
  isPromoEligible: boolean | null
  discountPrice: number | null
}

export function WishlistPageContent() {
  const productIds = useWishlistStore((state) => state.productIds)
  const [products, setProducts] = useState<WishlistProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([])
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    fetch(`/api/products/cart-items?ids=${productIds.join(',')}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить избранные товары')
        return response.json()
      })
      .then((items: WishlistProduct[]) => {
        const mapped = new Map(items.map((item) => [item.id, item]))
        setProducts(productIds.map((id) => mapped.get(id)).filter(Boolean) as WishlistProduct[])
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [productIds])

  return (
    <div className="max-w-[min(90rem,92vw)] mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">Избранное</h1>
      <p className="text-gray-600 mb-8">
        Сохраняйте товары в избранное и возвращайтесь к ним позже.
      </p>

      {isLoading ? (
        <p className="text-gray-500">Загрузка...</p>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600">
          В избранном пока пусто.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              title={product.title}
              price={product.price}
              priceOld={product.priceOld}
              photo={product.photo}
              slug={product.slug}
              isPromoEligible={product.isPromoEligible ?? true}
              discountPrice={product.discountPrice}
            />
          ))}
        </div>
      )}
    </div>
  )
}
