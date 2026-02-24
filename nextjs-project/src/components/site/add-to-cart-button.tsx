'use client'

import { useCartStore } from '@/store/cart-store'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  productId: string
  title: string
  price: number
  photo: string | null
  slug: string | null
  /** Товар с акционной ценой (priceOld) — скидка по промокоду на заказ на него не применяется */
  hasPromoPrice?: boolean
  /** Участвует в скидке по промокоду */
  isPromoEligible?: boolean
  /** Цена при применении промокода (если задана) */
  discountPrice?: number | null
  /** Compact style for product cards; default for product page */
  size?: 'default' | 'sm'
  className?: string
}

export function AddToCartButton({
  productId,
  title,
  price,
  photo,
  slug,
  hasPromoPrice = false,
  isPromoEligible = true,
  discountPrice = null,
  size = 'default',
  className,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem)
  const openDrawer = useCartStore((s) => s.openDrawer)

  const handleClick = () => {
    addItem({
      productId,
      title,
      price,
      quantity: 1,
      photo,
      slug,
      hasPromoPrice,
      isPromoEligible,
      discountPrice,
    })
    openDrawer()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-action-blue text-gray-800 font-medium hover:bg-action-blue/90 transition-colors whitespace-nowrap',
        size === 'default' && 'w-full sm:w-auto px-8 py-3 min-h-[44px]',
        size === 'sm' && 'w-full sm:w-auto px-4 py-2 text-sm min-h-[36px]',
        className
      )}
    >
      В корзину
    </button>
  )
}
