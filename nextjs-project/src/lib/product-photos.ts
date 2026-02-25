/**
 * Helpers for product photos JSON (array of { url, blurDataURL? } or legacy string[]).
 */

export function getFirstPhotoBlurDataURL(photos: unknown): string | undefined {
  if (!Array.isArray(photos) || photos.length === 0) return undefined;
  const first = photos[0];
  if (first && typeof first === 'object' && 'blurDataURL' in first && typeof (first as { blurDataURL?: string }).blurDataURL === 'string') {
    return (first as { blurDataURL: string }).blurDataURL;
  }
  return undefined;
}
