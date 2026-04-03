'use client'

import { useCartStore } from '@/store/cart-store'
import { cn } from '@/lib/utils'
import { logAnalyticsEvent } from '@/lib/analytics/analytics-client'

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

  function getCurrentPath(): string {
    if (typeof window === 'undefined') return '/catalog'
    const { pathname, search } = window.location
    return search ? `${pathname}${search}` : pathname
  }

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

    const path = getCurrentPath()

    logAnalyticsEvent({
      type: 'CLICK',
      path,
      meta: {
        kind: 'cta_add_to_cart',
        productId,
        slug,
      },
    })

    logAnalyticsEvent({
      type: 'CART_ADD',
      path,
      meta: {
        productId,
        title,
        price,
        quantity: 1,
        slug,
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-analytics-click="manual"
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-full text-center font-medium transition-colors',
        disabled
          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
          : 'bg-action-blue text-gray-800 hover:bg-action-blue/90',
        size === 'default' && 'w-full sm:w-auto px-8 py-3 min-h-[44px] 2xl:min-h-[50px] 2xl:text-base 3xl:min-h-[56px] 3xl:px-10',
        size === 'default' && 'whitespace-nowrap',
        size === 'sm' &&
          'w-full px-3 py-2 text-sm leading-tight whitespace-normal [overflow-wrap:anywhere] min-h-[40px] sm:min-h-[36px] sm:w-auto sm:px-4 2xl:min-h-[42px] 2xl:text-base 3xl:min-h-[48px] 3xl:px-5',
        className
      )}
    >
      {disabled ? disabledLabel ?? 'Товар закончился' : 'В корзину'}
    </button>
  )
}
