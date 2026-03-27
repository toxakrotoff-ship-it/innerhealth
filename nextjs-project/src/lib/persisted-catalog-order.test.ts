import { describe, expect, it } from 'vitest'
import { applyPersistedCatalogOrder, parsePersistedCatalogOrder } from '@/lib/persisted-catalog-order'

const FIXTURES = [
  { id: 'p-1', title: 'One' },
  { id: 'p-2', title: 'Two' },
  { id: 'p-3', title: 'Three' },
] as const

describe('persisted-catalog-order', () => {
  it('returns empty order for invalid json', () => {
    expect(parsePersistedCatalogOrder('invalid')).toEqual([])
  })

  it('parses valid json array', () => {
    expect(parsePersistedCatalogOrder('["p-3","p-1"]')).toEqual(['p-3', 'p-1'])
  })

  it('applies persisted id order and keeps unknown ids ignored', () => {
    const ordered = applyPersistedCatalogOrder(FIXTURES, ['p-3', 'missing', 'p-1'])
    expect(ordered.map((item) => item.id)).toEqual(['p-3', 'p-1', 'p-2'])
  })
})
