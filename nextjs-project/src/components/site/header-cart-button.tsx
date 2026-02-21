'use client'

import { useCartStore, useCartItemCount } from '@/store/cart-store'
import { useMounted } from '@/hooks/use-mounted'

interface HeaderCartButtonProps {
  variant?: 'light' | 'dark'
}

export function HeaderCartButton({ variant = 'light' }: HeaderCartButtonProps) {
  const mounted = useMounted()
  const openDrawer = useCartStore((s) => s.openDrawer)
  const itemCount = useCartItemCount()

  const buttonClass =
    variant === 'dark'
      ? 'relative p-1.5 sm:p-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shrink-0'
      : 'relative p-2 rounded-full text-gray-700 hover:bg-highlight-blue hover:text-action-blue transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'

  return (
    <button
      type="button"
      onClick={openDrawer}
      className={buttonClass}
      aria-label="Корзина"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {mounted && itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-action-blue text-gray-800 text-xs font-medium">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  )
}
