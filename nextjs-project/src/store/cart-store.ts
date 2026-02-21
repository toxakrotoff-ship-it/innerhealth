import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartLine {
  productId: string
  quantity: number
  price: number
  title: string
  photo: string | null
  slug: string | null
  /** Товар уже по акционной цене (есть priceOld) — скидка по промокоду на него не применяется */
  hasPromoPrice?: boolean
}

interface CartState {
  items: CartLine[]
  isDrawerOpen: boolean
  addItem: (line: CartLine) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      addItem(line) {
        set((state) => {
          const existing = state.items.find((i) => i.productId === line.productId)
          const items = existing
            ? state.items.map((i) =>
                i.productId === line.productId
                  ? {
                      ...i,
                      quantity: i.quantity + line.quantity,
                      hasPromoPrice: line.hasPromoPrice ?? i.hasPromoPrice,
                    }
                  : i
              )
            : [...state.items, { ...line, hasPromoPrice: line.hasPromoPrice ?? false }]
          return { items }
        })
      },

      removeItem(productId) {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
      },

      updateQuantity(productId, quantity) {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }))
      },

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'innerhealth-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)

// Selector for item count (for components that need to re-render on change)
export function useCartItemCount(): number {
  return useCartStore((state) =>
    state.items.reduce((sum, i) => sum + i.quantity, 0)
  )
}
