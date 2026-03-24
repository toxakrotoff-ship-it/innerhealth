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
  disabled?: boolean
  disabledLabel?: string
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
  disabled = false,
  disabledLabel,
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
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium transition-colors whitespace-nowrap',
        disabled
          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
          : 'bg-action-blue text-gray-800 hover:bg-action-blue/90',
        size === 'default' && 'w-full sm:w-auto px-8 py-3 min-h-[44px] 2xl:min-h-[50px] 2xl:text-base 3xl:min-h-[56px] 3xl:px-10',
        size === 'sm' && 'w-full sm:w-auto px-4 py-2 text-sm min-h-[36px] 2xl:min-h-[42px] 2xl:text-base 3xl:min-h-[48px] 3xl:px-5',
        className
      )}
    >
      {disabled ? disabledLabel ?? 'Товар закончился' : 'В корзину'}
    </button>
  )
}
