import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { normalizeProductPhoto } from '@/lib/product-photo-normalization'

describe('normalizeProductPhoto', () => {
  it('keeps original dimensions and only converts to webp for small images', async () => {
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
    expect(outMeta.width).toBe(700)
    expect(outMeta.height).toBe(1400)

    expect(result.blurDataURL).not.toBeNull()
    expect(result.blurDataURL).toMatch(/^data:image\/webp;base64,/)
  })

  it('limits very wide images by max width without cropping', async () => {
    const input = await sharp({
      create: {
        width: 3000,
        height: 1500,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .png()
      .toBuffer()

    const result = await normalizeProductPhoto(input)
    const outMeta = await sharp(result.webpBuffer).metadata()

    expect(outMeta.format).toBe('webp')
    expect(outMeta.width).toBe(1920)
    expect(outMeta.height).toBe(960)
  })
})

