import { describe, expect, it } from 'vitest'
import { buildCdekWidgetItemsSignature, getCdekWidgetCartLines } from '@/lib/cdek-widget-items'

describe('cdek-widget-items', () => {
  it('excludes gift lines from widget cart payload', () => {
    const lines = getCdekWidgetCartLines([
      { productId: 'a', quantity: 2 },
      { productId: 'gift', quantity: 1, isGift: true },
    ])

    expect(lines).toEqual([{ productId: 'a', quantity: 2 }])
  })

  it('builds a stable signature from product ids and quantities only', () => {
    const signature = buildCdekWidgetItemsSignature([
      { productId: 'b', quantity: 1, title: 'First title' },
      { productId: 'a', quantity: 2 },
      { productId: 'gift', quantity: 1, isGift: true },
    ])

    expect(signature).toBe('a:2|b:1')
  })

  it('does not change signature when enrichment adds product details', () => {
    const before = buildCdekWidgetItemsSignature([{ productId: 'a', quantity: 1 }])
    const after = buildCdekWidgetItemsSignature([
      { productId: 'a', quantity: 1, title: 'Product', price: 1000 },
    ])

    expect(after).toBe(before)
  })
})
