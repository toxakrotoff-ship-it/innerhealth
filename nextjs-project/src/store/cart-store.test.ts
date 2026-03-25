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
