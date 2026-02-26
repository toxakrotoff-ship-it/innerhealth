'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  productIds: string[]
  isInWishlist: (productId: string) => boolean
  toggleProduct: (productId: string) => void
  removeProduct: (productId: string) => void
  clearWishlist: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],
      isInWishlist: (productId) => get().productIds.includes(productId),
      toggleProduct: (productId) =>
        set((state) => {
          const exists = state.productIds.includes(productId)
          return {
            productIds: exists
              ? state.productIds.filter((id) => id !== productId)
              : [productId, ...state.productIds],
          }
        }),
      removeProduct: (productId) =>
        set((state) => ({
          productIds: state.productIds.filter((id) => id !== productId),
        })),
      clearWishlist: () => set({ productIds: [] }),
    }),
    {
      name: 'innerhealth-wishlist',
      partialize: (state) => ({ productIds: state.productIds }),
    }
  )
)
