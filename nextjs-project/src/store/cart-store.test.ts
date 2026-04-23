/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from '@/store/cart-store'

describe('cart-store ownership sync', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({
      items: [],
      isDrawerOpen: false,
    })
  })

  it('clears legacy persisted cart on first owner sync', () => {
    useCartStore.getState().addItem({ productId: 'p-1', quantity: 1 })
    expect(useCartStore.getState().items).toHaveLength(1)

    useCartStore.getState().syncOwner('user-a')

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('clears cart when owner changes', () => {
    useCartStore.getState().syncOwner('user-a')
    useCartStore.getState().addItem({ productId: 'p-1', quantity: 1 })
    expect(useCartStore.getState().items).toHaveLength(1)

    useCartStore.getState().syncOwner('user-b')

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

describe('cart-store gifts reconciliation', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({
      items: [],
      isDrawerOpen: false,
    })
  })

  it('adds a gift line when missing', () => {
    useCartStore.setState({
      items: [{ productId: 'A', quantity: 1, price: 100 }],
      isDrawerOpen: false,
    })

    useCartStore.getState().applyGiftLines({
      gifts: [{ giftProductId: 'G1', quantity: 1, giftPromotionId: 'P1' }],
    })

    const items = useCartStore.getState().items
    expect(items.some((i) => i.productId === 'G1' && i.isGift === true)).toBe(true)
  })

  it('updates gift quantity and promotion id', () => {
    useCartStore.setState({
      items: [{ productId: 'G1', quantity: 1, price: 0, isGift: true, giftPromotionId: 'P1' }],
      isDrawerOpen: false,
    })

    useCartStore.getState().applyGiftLines({
      gifts: [{ giftProductId: 'G1', quantity: 2, giftPromotionId: 'P2' }],
    })

    const gift = useCartStore.getState().items.find((i) => i.productId === 'G1')
    expect(gift?.quantity).toBe(2)
    expect(gift?.giftPromotionId).toBe('P2')
  })

  it('removes gift lines not present in result', () => {
    useCartStore.setState({
      items: [
        { productId: 'A', quantity: 1, price: 100 },
        { productId: 'G1', quantity: 1, price: 0, isGift: true, giftPromotionId: 'P1' },
      ],
      isDrawerOpen: false,
    })

    useCartStore.getState().applyGiftLines({ gifts: [] })

    expect(useCartStore.getState().items.some((i) => i.isGift === true)).toBe(false)
  })

  it('is idempotent for same gifts', () => {
    useCartStore.setState({
      items: [{ productId: 'A', quantity: 1, price: 100 }],
      isDrawerOpen: false,
    })

    useCartStore.getState().applyGiftLines({
      gifts: [{ giftProductId: 'G1', quantity: 1, giftPromotionId: 'P1' }],
    })
    const once = useCartStore.getState().items

    useCartStore.getState().applyGiftLines({
      gifts: [{ giftProductId: 'G1', quantity: 1, giftPromotionId: 'P1' }],
    })
    const twice = useCartStore.getState().items

    expect(twice).toEqual(once)
  })
})
