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
      ? 'relative p-1.5 sm:p-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] 2xl:min-h-[52px] 2xl:min-w-[52px] 3xl:min-h-[58px] 3xl:min-w-[58px] flex items-center justify-center shrink-0'
      : 'relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] 2xl:min-h-[52px] 2xl:min-w-[52px] 3xl:min-h-[58px] 3xl:min-w-[58px] flex items-center justify-center shrink-0'

  return (
    <button
      type="button"
      onClick={openDrawer}
      className={buttonClass}
      aria-label="Корзина"
    >
      <svg className="h-6 w-6 2xl:h-7 2xl:w-7 3xl:h-8 3xl:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {mounted && itemCount > 0 && (
        <span className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium 2xl:h-5 2xl:w-5 2xl:text-[11px] ${variant === 'dark' ? 'bg-action-blue text-gray-800' : 'bg-action-blue text-white'}`}>
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  )
}
