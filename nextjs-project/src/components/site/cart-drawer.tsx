'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cart-store'

export function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, removeItem, updateQuantity } = useCartStore()

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

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeDrawer}
            aria-hidden
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl flex flex-col"
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
                      <div className="relative w-16 h-16 rounded-lg bg-highlight-blue flex-shrink-0 overflow-hidden">
                        {line.photo ? (
                          <Image
                            src={line.photo.startsWith('/') ? line.photo : `/${line.photo.replace(/^\//, '')}`}
                            alt={line.title}
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
                          {line.title}
                        </Link>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {line.price.toLocaleString('ru-RU')} ₽ × {line.quantity}
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
