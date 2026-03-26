import { describe, expect, it } from 'vitest'
import { getPhotoTransformByUrl, normalizePhotoTransform } from '@/lib/product-photo-transform'

describe('normalizePhotoTransform', () => {
  it('normalizes invalid values to safe defaults', () => {
    const result = normalizePhotoTransform({
      fitMode: 'invalid',
      x: 999,
      y: -999,
      zoom: 0.1,
    })

    expect(result).toEqual({
      fitMode: 'contain',
      x: 50,
      y: -50,
      zoom: 1,
    })
  })
})

describe('getPhotoTransformByUrl', () => {
  it('returns transform for matching url record', () => {
    const result = getPhotoTransformByUrl(
      [
        { url: '/a.webp', transform: { fitMode: 'cover', x: 10, y: -5, zoom: 1.2 } },
        '/b.webp',
      ],
      '/a.webp'
    )

    expect(result).toEqual({ fitMode: 'cover', x: 10, y: -5, zoom: 1.2 })
  })
})
