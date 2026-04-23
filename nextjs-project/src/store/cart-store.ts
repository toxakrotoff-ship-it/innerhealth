import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartLine {
  productId: string
  quantity: number
  /** Omitted when rehydrated from localStorage (only productId+quantity persisted). */
  price?: number
  title?: string
  photo?: string | null
  slug?: string | null
  /** Товар уже по акционной цене (есть priceOld) — скидка по промокоду на него не применяется */
  hasPromoPrice?: boolean
  /** Участвует в скидке по промокоду (Rule: скидка только к eligible и не к «уже по акции») */
  isPromoEligible?: boolean
  /** Цена за единицу при применении промокода (если задана — подставляется вместо расчёта %/фикс) */
  discountPrice?: number | null
  /** Gift line inserted by gift promotion sync. */
  isGift?: boolean
  giftPromotionId?: string | null
}

export type CartLineDetails = Pick<
  CartLine,
  'title' | 'price' | 'photo' | 'slug' | 'hasPromoPrice' | 'isPromoEligible' | 'discountPrice'
>

export interface GiftLineInput {
  readonly giftProductId: string
  readonly quantity: number
  readonly giftPromotionId: string
}

interface CartState {
  items: CartLine[]
  isDrawerOpen: boolean
  ownerKey: string | null
  addItem: (line: CartLine) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  mergeItemDetails: (productId: string, details: CartLineDetails) => void
  applyGiftLines: (params: { readonly gifts: readonly GiftLineInput[] }) => void
  syncOwner: (ownerId: string | null) => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  clearCart: () => void
}

function toOwnerKey(ownerId: string | null): string {
  if (ownerId != null && ownerId.trim().length > 0) return `user:${ownerId.trim()}`
  return 'guest'
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      ownerKey: null,

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
                      isPromoEligible: line.isPromoEligible ?? i.isPromoEligible,
                      discountPrice: line.discountPrice ?? i.discountPrice,
                    }
                  : i
              )
            : [...state.items, { ...line, hasPromoPrice: line.hasPromoPrice ?? false, isPromoEligible: line.isPromoEligible ?? true, discountPrice: line.discountPrice ?? null }]
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

      mergeItemDetails(productId, details) {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, ...details } : i
          ),
        }))
      },

      applyGiftLines(params) {
        set((state) => {
          const nonGift = state.items.filter((i) => i.isGift !== true)
          const nextGifts: CartLine[] = params.gifts.map((g) => ({
            productId: g.giftProductId,
            quantity: Math.max(1, Math.floor(g.quantity)),
            price: 0,
            isGift: true,
            giftPromotionId: g.giftPromotionId,
            hasPromoPrice: true,
            isPromoEligible: false,
            discountPrice: null,
            title: undefined,
            photo: null,
            slug: null,
          }))

          const items = [...nonGift, ...nextGifts]

          if (items.length === state.items.length) {
            const same = items.every((it, idx) => {
              const prev = state.items[idx]
              return (
                prev?.productId === it.productId &&
                prev?.quantity === it.quantity &&
                (prev?.isGift ?? false) === (it.isGift ?? false) &&
                (prev?.giftPromotionId ?? null) === (it.giftPromotionId ?? null)
              )
            })
            if (same) return state
          }

          return { items }
        })
      },

      syncOwner(ownerId) {
        const nextOwnerKey = toOwnerKey(ownerId)
        set((state) => {
          // Legacy persisted carts (without ownerKey) are ambiguous: reset once.
          if (state.ownerKey == null) {
            if (state.items.length === 0) return { ownerKey: nextOwnerKey }
            return { ownerKey: nextOwnerKey, items: [] }
          }
          if (state.ownerKey === nextOwnerKey) return state
          return { ownerKey: nextOwnerKey, items: [] }
        })
      },

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'innerhealth-cart',
      /** Persist only productId and quantity to reduce localStorage size. */
      partialize: (state) => ({
        ownerKey: state.ownerKey,
        items: state.items.map(({ productId, quantity }) => ({ productId, quantity })),
      }),
    }
  )
)

// Selector for item count (for components that need to re-render on change)
export function useCartItemCount(): number {
  return useCartStore((state) =>
    state.items.reduce((sum, i) => sum + i.quantity, 0)
  )
}
