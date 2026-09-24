/**
 * Timeweb CDN (ресурс Inner-CDN, origin = innerhealth.ru).
 * Build-time: `NEXT_PUBLIC_CDN_URL` встраивается в клиентский бандл. Пусто — CDN выключен, всё идёт с origin.
 */
export const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL ?? '').trim().replace(/\/+$/, '')

/** Префиксы путей, которые безопасно отдавать через CDN (имена файлов уникальны, `immutable`). */
const CDN_PATH_PREFIXES = ['/uploads/'] as const

/** `/uploads/...` → `${CDN_URL}/uploads/...`; внешние URL, data: и прочие пути — без изменений. */
export function toCdnUrl(src: string): string
export function toCdnUrl(src: string | null | undefined): string | null | undefined
export function toCdnUrl(src: string | null | undefined): string | null | undefined {
  if (!CDN_URL || typeof src !== 'string') return src
  return CDN_PATH_PREFIXES.some((prefix) => src.startsWith(prefix)) ? `${CDN_URL}${src}` : src
}
