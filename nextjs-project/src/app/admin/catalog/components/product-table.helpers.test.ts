import { describe, expect, it } from 'vitest'
import { applyPersistedOrder, reorderProductsByIds, toPersistedOrder } from './product-table.helpers'

interface ProductFixture {
  id: string
  title: string
}

const FIXTURES: ProductFixture[] = [
  { id: 'p-1', title: 'One' },
  { id: 'p-2', title: 'Two' },
  { id: 'p-3', title: 'Three' },
]

describe('product-table.helpers', () => {
  it('reorders list by drag ids', () => {
    const next = reorderProductsByIds(FIXTURES, 'p-1', 'p-3')
    expect(next.map((product) => product.id)).toEqual(['p-2', 'p-3', 'p-1'])
  })

  it('keeps list untouched when ids are not found', () => {
    const next = reorderProductsByIds(FIXTURES, 'missing', 'p-2')
    expect(next.map((product) => product.id)).toEqual(['p-1', 'p-2', 'p-3'])
  })

  it('applies persisted order first and keeps unknown ids ignored', () => {
    const next = applyPersistedOrder(FIXTURES, ['p-3', 'missing', 'p-1'])
    expect(next.map((product) => product.id)).toEqual(['p-3', 'p-1', 'p-2'])
  })

  it('serializes order to product id list', () => {
    expect(toPersistedOrder(FIXTURES)).toEqual(['p-1', 'p-2', 'p-3'])
  })
})
