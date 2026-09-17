import 'server-only'

import { headers } from 'next/headers'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { getBrandSiteUrl } from '@/lib/brand/site-branding'

const FALLBACK_SITE_URL = 'https://innerhaealth.inetrnet.pp.ru'

function getEnvSiteBaseUrl(): string {
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
 * Canonical origin for absolute URLs (metadata, OG, sitemap, robots, JSON-LD).
 * Resolves the brand of the CURRENT request from headers (host / `x-brand`),
 * so Inner Health and Sprint Power each get their own domain — this fixes a
 * bug where breadcrumbs/RSS/llms.txt on sprintpower.ru resolved to
 * innerhealth.ru because the base URL came from a single global env var.
 * Falls back to `NEXT_PUBLIC_SITE_URL` / Vercel host when there is no
 * request context (e.g. build-time / outside a request).
 */
export async function getSiteBaseUrl(): Promise<string> {
  try {
    const headerStore = await headers()
    const brandId = resolveSiteBrand({
      forwardedBrand: headerStore.get('x-brand'),
      host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
    })
    return getBrandSiteUrl(brandId).replace(/\/+$/, '')
  } catch {
    return getEnvSiteBaseUrl()
  }
}

/**
 * Absolute URL for a site path (leading slash optional).
 */
export async function toAbsoluteSiteUrl(path: string): Promise<string> {
  const base = await getSiteBaseUrl()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
