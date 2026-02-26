'use client'

import { useWishlistStore } from '@/store/wishlist-store'
import { cn } from '@/lib/utils'

interface WishlistToggleButtonProps {
  productId: string
  className?: string
  iconOnly?: boolean
}

export function WishlistToggleButton({ productId, className, iconOnly = false }: WishlistToggleButtonProps) {
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(productId))
  const toggleProduct = useWishlistStore((state) => state.toggleProduct)

  return (
    <button
      type="button"
      onClick={() => toggleProduct(productId)}
      className={cn(
        'inline-flex items-center justify-center rounded-full border text-sm transition-colors',
        iconOnly ? 'h-9 w-9 p-0' : 'px-3 py-2 min-h-[36px]',
        isInWishlist
          ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        className
      )}
      aria-pressed={isInWishlist}
      aria-label={isInWishlist ? 'Убрать из избранного' : 'Добавить в избранное'}
      title={isInWishlist ? 'Убрать из избранного' : 'Добавить в избранное'}
    >
      <svg className={cn('h-4 w-4', isInWishlist && 'fill-current')} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!iconOnly && (
        <span className="ml-2 hidden sm:inline">
          {isInWishlist ? 'В избранном' : 'В избранное'}
        </span>
      )}
    </button>
  )
}
