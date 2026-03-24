import 'server-only'

import { cookies, headers } from 'next/headers'
import { resolveBrand, type BrandId } from '@/lib/brand/brand'
import { getBrandSiteConfig, getBrandSiteUrl } from '@/lib/brand/site-branding'

export interface ServerBrandContext {
  brandId: BrandId
  siteUrl: string
  siteTitle: string
}

export async function getServerBrandContext(): Promise<ServerBrandContext> {
  const headerStore = await headers()
  const cookieStore = await cookies()
  const brandId = resolveBrand({
    forwardedBrand: headerStore.get('x-brand'),
    cookieBrand: cookieStore.get('ih_active_brand')?.value ?? null,
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const siteConfig = getBrandSiteConfig(brandId)
  return {
    brandId,
    siteUrl: getBrandSiteUrl(brandId),
    siteTitle: siteConfig.title,
  }
}

