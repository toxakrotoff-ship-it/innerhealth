import { describe, expect, it } from 'vitest'
import {
  getProductImagePostprocessClasses,
  shouldShowProductMediaBackdrop,
} from '@/components/site/product-image-postprocess'

describe('getProductImagePostprocessClasses', () => {
  it('returns contain mode for catalog cards by default', () => {
    const result = getProductImagePostprocessClasses({ surface: 'catalog-card' })

    expect(result).toContain('object-contain')
    expect(result).toContain('object-center')
  })

  it('returns legacy cover-top mode when requested explicitly', () => {
    const result = getProductImagePostprocessClasses({
      surface: 'catalog-card',
      mode: 'cover-top',
    })

    expect(result).toContain('object-cover')
    expect(result).toContain('object-top')
  })

  it('returns enhanced crop mode for stronger framing', () => {
    const result = getProductImagePostprocessClasses({
      surface: 'catalog-card',
      mode: 'cover-crop-center',
    })

    expect(result).toContain('object-cover')
    expect(result).toContain('object-center')
    expect(result).toContain('scale-105')
  })

  it('uses decorative backdrop in contain-safe mode', () => {
    expect(shouldShowProductMediaBackdrop({ mode: 'contain-safe' })).toBe(true)
  })

  it('hides decorative backdrop in cover modes', () => {
    expect(shouldShowProductMediaBackdrop({ mode: 'cover-top' })).toBe(false)
    expect(shouldShowProductMediaBackdrop({ mode: 'cover-crop-center' })).toBe(false)
  })
})
