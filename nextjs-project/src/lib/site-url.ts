import 'server-only'

const FALLBACK_SITE_URL = 'https://innerhaealth.inetrnet.pp.ru'

/**
 * Canonical origin for absolute URLs (metadata, OG, sitemap, robots, JSON-LD).
 * Trailing slash is stripped. Set `NEXT_PUBLIC_SITE_URL` in production.
 */
export function getSiteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '')
  }
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelHost) {
    return `https://${vercelHost.replace(/\/+$/, '')}`
  }
  return FALLBACK_SITE_URL
}

/**
 * Absolute URL for a site path (leading slash optional).
 */
export function toAbsoluteSiteUrl(path: string): string {
  const base = getSiteBaseUrl()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
