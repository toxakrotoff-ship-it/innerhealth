/**
 * Helpers for product photos JSON (array of { url, blurDataURL? } or legacy string[]).
 */

import { getPhotoTransformByUrl, type ProductPhotoTransform } from '@/lib/product-photo-transform'

export function getFirstPhotoBlurDataURL(photos: unknown): string | undefined {
  if (!Array.isArray(photos) || photos.length === 0) return undefined;
  const first = photos[0];
  if (first && typeof first === 'object' && 'blurDataURL' in first && typeof (first as { blurDataURL?: string }).blurDataURL === 'string') {
    return (first as { blurDataURL: string }).blurDataURL;
  }
  return undefined;
}

export function getFirstPhotoTransform(photos: unknown): ProductPhotoTransform | undefined {
  if (!Array.isArray(photos) || photos.length === 0) return undefined
  const first = photos[0]
  if (typeof first === 'string') return getPhotoTransformByUrl(photos, first)
  if (first && typeof first === 'object' && 'url' in first && typeof (first as { url?: string }).url === 'string') {
    return getPhotoTransformByUrl(photos, (first as { url: string }).url)
  }
  return undefined
}
