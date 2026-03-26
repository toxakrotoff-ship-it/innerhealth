import type { ProductPhotoTransform } from '@/lib/product-photo-transform'
import { normalizePhotoTransform } from '@/lib/product-photo-transform'

export interface ProductGalleryPhoto {
  url: string
  blurDataURL?: string
  transform?: ProductPhotoTransform
}

function normalizePhotoUrl(raw: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.startsWith('/')) return raw
  return `/${raw.replace(/^\//, '')}`
}

export function parseProductGalleryPhotos(photos: unknown, fallbackPhoto: string | null): ProductGalleryPhoto[] {
  const normalized: ProductGalleryPhoto[] = []
  if (Array.isArray(photos)) {
    for (const item of photos) {
      if (typeof item === 'string' && item.trim()) {
        normalized.push({ url: normalizePhotoUrl(item.trim()) })
      } else if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>
        const url = typeof record.url === 'string' ? record.url.trim() : ''
        if (!url) continue
        const blurDataURL = typeof record.blurDataURL === 'string' ? record.blurDataURL : undefined
        const transform = record.transform ? normalizePhotoTransform(record.transform) : undefined
        normalized.push({ url: normalizePhotoUrl(url), blurDataURL, transform })
      }
    }
  }

  if (normalized.length > 0) return normalized
  if (fallbackPhoto?.trim()) return [{ url: normalizePhotoUrl(fallbackPhoto.trim()) }]
  return []
}
