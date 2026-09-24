'use client'

import { toCdnUrl } from './cdn'

/**
 * `images.loaderFile` для next/image: без ресайза (как раньше с `unoptimized: true`),
 * только переносит `/uploads/*` на CDN. `w` добавляется к своим путям, чтобы Next не ругался,
 * что loader игнорирует ширину; origin и CDN (без учёта query string) его игнорируют.
 */
export default function cdnImageLoader({ src, width }: { src: string; width: number }): string {
  if (!src.startsWith('/')) return src
  const url = toCdnUrl(src)
  return `${url}${url.includes('?') ? '&' : '?'}w=${width}`
}
