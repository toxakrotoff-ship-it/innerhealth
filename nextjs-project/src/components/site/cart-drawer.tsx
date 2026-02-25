'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/store/cart-store'
import { cn } from '@/lib/utils'

export function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeItem, mergeItemDetails } = useCartStore()
  const asideRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  useEffect(() => {
    const el = asideRef.current
    if (!el) return
    if (isDrawerOpen) {
      el.removeAttribute('inert')
    } else {
      el.setAttribute('inert', '')
    }
  }, [isDrawerOpen])

  /** Enrich slim items (rehydrated from localStorage) with product details. */
  useEffect(() => {
    const slimIds = items.filter((i) => i.title == null).map((i) => i.productId)
    if (slimIds.length === 0) return
    const controller = new AbortController()
    fetch(`/api/products/cart-items?ids=${slimIds.join(',')}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((products: Array<{ id: string; title: string; price: number; priceOld: number | null; photo: string | null; slug: string | null; isPromoEligible: boolean | null; discountPrice: number | null }>) => {
        products.forEach((p) => {
          const hasPromoPrice = p.priceOld != null && p.priceOld > p.price
          mergeItemDetails(p.id, {
            title: p.title,
            price: p.price,
            photo: p.photo ?? null,
            slug: p.slug ?? null,
            hasPromoPrice,
            isPromoEligible: p.isPromoEligible ?? true,
            discountPrice: p.discountPrice ?? null,
          })
        })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [items, mergeItemDetails])

  const total = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0)

  return (
    <>
      {/* Backdrop: при закрытии скрыт от скринридеров */}
      <div
        role="presentation"
        aria-hidden={!isDrawerOpen}
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ease-out',
          isDrawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeDrawer}
      />
      {/* Panel: при закрытии aria-hidden и inert — не получает фокус с клавиатуры */}
      <aside
        ref={asideRef}
        aria-modal={isDrawerOpen}
        aria-hidden={!isDrawerOpen}
        aria-label="Корзина"
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl flex flex-col',
          'transition-transform duration-300 ease-out',
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-text">Корзина</h2>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Корзина пуста</p>
          ) : (
            <ul className="space-y-4">
              {items.map((line) => (
                <li key={line.productId} className="flex gap-3 border-b border-gray-100 pb-4">
                  <div className="relative w-16 h-16 rounded-lg bg-highlight-blue shrink-0 overflow-hidden">
                    {line.photo ? (
                      <Image
                        src={line.photo.startsWith('/') ? line.photo : `/${line.photo.replace(/^\//, '')}`}
                        alt={line.title ?? ''}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <span className="text-action-blue/40 text-2xl m-auto">?</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={line.slug ? `/product/${line.slug}` : `/product/id/${line.productId}`}
                      onClick={closeDrawer}
                      className="font-medium text-text hover:text-action-blue line-clamp-2"
                    >
                      {line.title ?? 'Загрузка...'}
                    </Link>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {line.price != null
                          ? `${line.price.toLocaleString('ru-RU')} ₽ × ${line.quantity}`
                          : `— × ${line.quantity}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(line.productId)}
                        className="text-gray-400 hover:text-destructive text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex justify-between text-lg font-semibold text-text">
              <span>Итого:</span>
              <span>{total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="flex w-full py-3 px-4 rounded-full bg-action-blue text-gray-800 text-center font-medium hover:bg-action-blue/90 transition-colors min-h-[44px] items-center justify-center"
            >
              Оформить заказ
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
