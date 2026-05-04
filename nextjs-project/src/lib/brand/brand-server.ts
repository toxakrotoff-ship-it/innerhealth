import 'server-only'

import { headers } from 'next/headers'
import type { BrandId } from '@/lib/brand/brand'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { getBrandSiteConfig, getBrandSiteUrl } from '@/lib/brand/site-branding'

export interface ServerBrandContext {
  brandId: BrandId
  siteUrl: string
  siteTitle: string
}

export async function getServerBrandContext(): Promise<ServerBrandContext> {
  const headerStore = await headers()
  const brandId = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const siteConfig = getBrandSiteConfig(brandId)
  return {
    brandId,
    siteUrl: getBrandSiteUrl(brandId),
    siteTitle: siteConfig.title,
  }
}

