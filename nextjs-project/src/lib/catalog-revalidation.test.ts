import { describe, expect, it } from 'vitest'
import { buildCatalogRevalidationPaths } from './catalog-revalidation'

describe('buildCatalogRevalidationPaths', () => {
  it('returns base catalog paths when category slugs are empty', () => {
    expect(buildCatalogRevalidationPaths([])).toEqual(['/', '/catalog'])
  })

  it('includes unique category paths and ignores invalid slugs', () => {
    const paths = buildCatalogRevalidationPaths([
      'nutrienty',
      '',
      ' nutrinety-2 ',
      'nutrienty',
      '   ',
    ])

    expect(paths).toEqual([
      '/',
      '/catalog',
      '/catalog/nutrienty',
      '/catalog/nutrinety-2',
    ])
  })
})
