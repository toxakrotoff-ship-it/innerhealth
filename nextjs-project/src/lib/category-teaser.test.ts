import { describe, expect, it } from 'vitest'
import {
  MAX_CATEGORY_TEASER_LENGTH,
  normalizeCategoryTeaser,
} from '@/lib/category-teaser'

describe('normalizeCategoryTeaser', () => {
  it('keeps null as null', () => {
    expect(normalizeCategoryTeaser(null)).toBeNull()
  })

  it('returns null for blank teaser', () => {
    expect(normalizeCategoryTeaser('   ')).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeCategoryTeaser('  Короткий тизер  ')).toBe('Короткий тизер')
  })

  it('keeps undefined as undefined', () => {
    expect(normalizeCategoryTeaser(undefined)).toBeUndefined()
  })
})

describe('MAX_CATEGORY_TEASER_LENGTH', () => {
  it('stays aligned with catalog card constraints', () => {
    expect(MAX_CATEGORY_TEASER_LENGTH).toBe(160)
  })
})
