import sharp from 'sharp'

const MAX_INPUT_WIDTH = 1920
const BLUR_PLACEHOLDER_SIZE = 10

interface NormalizeProductPhotoResult {
  readonly webpBuffer: Buffer
  readonly blurDataURL: string | null
}

export async function normalizeProductPhoto(inputBuffer: Buffer): Promise<NormalizeProductPhotoResult> {
  const base = sharp(inputBuffer).rotate()

  const metadata = await base.metadata()
  const inputWidth = metadata.width ?? 0

  const resizedForSafety =
    inputWidth > MAX_INPUT_WIDTH
      ? base.resize(MAX_INPUT_WIDTH, null, { withoutEnlargement: true })
      : base

  const webpBuffer = await resizedForSafety.webp({ quality: 85 }).toBuffer()

  try {
    const blurBuffer = await sharp(webpBuffer)
      .resize(BLUR_PLACEHOLDER_SIZE, BLUR_PLACEHOLDER_SIZE, { fit: 'cover' })
      .webp({ quality: 20 })
      .toBuffer()
    return { webpBuffer, blurDataURL: `data:image/webp;base64,${blurBuffer.toString('base64')}` }
  } catch {
    return { webpBuffer, blurDataURL: null }
  }
}

