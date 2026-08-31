import { describe, expect, it } from 'vitest'
import { CATEGORY_SLUG_PATTERN, normalizeCategorySlug } from './category-slug'

describe('normalizeCategorySlug', () => {
  it('normalizes casing and surrounding whitespace', () => {
    expect(normalizeCategorySlug('  Crema-I-Mazi  ')).toBe('crema-i-mazi')
  })

  it('replaces visually confusable Cyrillic characters', () => {
    expect(normalizeCategorySlug('сrema-i-mazi')).toBe('crema-i-mazi')
  })

  it('does not make a genuinely Cyrillic slug pass ASCII validation', () => {
    expect(CATEGORY_SLUG_PATTERN.test(normalizeCategorySlug('крема-и-мази'))).toBe(false)
  })
})
