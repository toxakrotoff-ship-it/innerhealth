import { describe, expect, it } from 'vitest'
import { filterVisibleProducts } from './catalog-visibility'

describe('filterVisibleProducts', () => {
  it('excludes draft products from category output', () => {
    const products = [
      { id: 'visible-1', title: 'Visible 1', isDraft: false },
      { id: 'draft-1', title: 'Draft 1', isDraft: true },
      { id: 'visible-2', title: 'Visible 2', isDraft: false },
    ] as const

    const visibleProducts = filterVisibleProducts(products)

    expect(visibleProducts).toEqual([
      { id: 'visible-1', title: 'Visible 1', isDraft: false },
      { id: 'visible-2', title: 'Visible 2', isDraft: false },
    ])
  })
})
