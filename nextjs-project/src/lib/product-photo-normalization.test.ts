import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { normalizeProductPhoto } from '@/lib/product-photo-normalization'

describe('normalizeProductPhoto', () => {
  it('returns 1200x1200 webp buffer and blur placeholder', async () => {
    const input = await sharp({
      create: {
        width: 700,
        height: 1400,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .png()
      .toBuffer()

    const result = await normalizeProductPhoto(input)

    const outMeta = await sharp(result.webpBuffer).metadata()
    expect(outMeta.format).toBe('webp')
    expect(outMeta.width).toBe(1200)
    expect(outMeta.height).toBe(1200)

    expect(result.blurDataURL).not.toBeNull()
    expect(result.blurDataURL).toMatch(/^data:image\/webp;base64,/)
  })
})

