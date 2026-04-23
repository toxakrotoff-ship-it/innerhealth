import { create } from 'zustand'

interface PromoState {
  hasPromoCode: boolean
  setHasPromoCode: (next: boolean) => void
  clearPromoCode: () => void
}

export const usePromoStore = create<PromoState>()((set) => ({
  hasPromoCode: false,
  setHasPromoCode: (next) => set({ hasPromoCode: next }),
  clearPromoCode: () => set({ hasPromoCode: false }),
}))

