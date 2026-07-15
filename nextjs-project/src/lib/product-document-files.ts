const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46])
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])
const RIFF_SIGNATURE = Buffer.from([0x52, 0x49, 0x46, 0x46])
const WEBP_SIGNATURE = Buffer.from([0x57, 0x45, 0x42, 0x50])

export const PRODUCT_DOCUMENT_MAX_FILE_SIZE = 20 * 1024 * 1024
export const PRODUCT_DOCUMENT_UPLOAD_FOLDER = 'documents'

export const PRODUCT_DOCUMENT_ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type SupportedProductDocumentMime = (typeof PRODUCT_DOCUMENT_ACCEPTED_TYPES)[number]

const MIME_TO_EXT: Record<SupportedProductDocumentMime, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function detectProductDocumentMime(
  buffer: Buffer
): SupportedProductDocumentMime | null {
  if (buffer.length >= PDF_SIGNATURE.length && buffer.subarray(0, 4).equals(PDF_SIGNATURE)) {
    return 'application/pdf'
  }
  if (buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 4).equals(PNG_SIGNATURE)) {
    return 'image/png'
  }
  if (buffer.length >= JPEG_SIGNATURE.length && buffer.subarray(0, 3).equals(JPEG_SIGNATURE)) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(RIFF_SIGNATURE) &&
    buffer.subarray(8, 12).equals(WEBP_SIGNATURE)
  ) {
    return 'image/webp'
  }
  return null
}

export function isAllowedProductDocumentMime(
  mimeType: string | null | undefined
): mimeType is SupportedProductDocumentMime {
  return PRODUCT_DOCUMENT_ACCEPTED_TYPES.includes(mimeType as SupportedProductDocumentMime)
}

export function normalizeDocumentBaseName(fileName: string | null | undefined): string {
  const normalized = (fileName ?? '')
    .normalize('NFKD')
    .replace(/[\\/]+/g, '-')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/^-|-$/g, '')
    .toLowerCase()

  return normalized || 'document'
}

export function buildStoredProductDocumentFileName(params: {
  brand: string
  originalName: string | null | undefined
  mimeType: SupportedProductDocumentMime
}): string {
  const baseName = normalizeDocumentBaseName(params.originalName).replace(/\.[a-z0-9]+$/i, '')
  const ext = MIME_TO_EXT[params.mimeType]
  const safeBrand = params.brand.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'inner'
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${safeBrand}-${baseName || 'document'}-${uniquePart}.${ext}`
}
