export interface ProductPhotoTransform {
  fitMode: 'contain' | 'cover'
  x: number
  y: number
  zoom: number
}

interface ProductPhotoRecord {
  url: string
  transform?: unknown
}

const DEFAULT_TRANSFORM: ProductPhotoTransform = {
  fitMode: 'contain',
  x: 0,
  y: 0,
  zoom: 1,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizePhotoUrl(rawUrl: string): string {
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl
  if (rawUrl.startsWith('/')) return rawUrl
  return `/${rawUrl.replace(/^\//, '')}`
}

export function normalizePhotoTransform(input: unknown): ProductPhotoTransform {
  if (!input || typeof input !== 'object') return DEFAULT_TRANSFORM
  const record = input as Record<string, unknown>
  const fitMode = record.fitMode === 'cover' ? 'cover' : 'contain'
  const x = typeof record.x === 'number' ? clamp(record.x, -50, 50) : 0
  const y = typeof record.y === 'number' ? clamp(record.y, -50, 50) : 0
  const zoom = typeof record.zoom === 'number' ? clamp(record.zoom, 1, 2) : 1
  return { fitMode, x, y, zoom }
}

export function getPhotoTransformByUrl(photos: unknown, targetUrl: string | null | undefined): ProductPhotoTransform | undefined {
  if (!Array.isArray(photos) || !targetUrl) return undefined
  const normalizedTargetUrl = normalizePhotoUrl(targetUrl)
  for (const item of photos) {
    if (!item || typeof item !== 'object') continue
    const record = item as ProductPhotoRecord
    if (typeof record.url !== 'string') continue
    if (normalizePhotoUrl(record.url) !== normalizedTargetUrl) continue
    if (!record.transform) return undefined
    return normalizePhotoTransform(record.transform)
  }
  return undefined
}
