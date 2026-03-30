import { cookies, headers } from 'next/headers'
import { getSettingsMap } from '@/services/settings.service'
import { buildOrganizationJsonLd, buildWebSiteJsonLdWithOverrides } from '@/lib/schema-org'
import { resolveBrand } from '@/lib/brand/brand'
import { getBrandSiteConfig, getBrandSiteUrl } from '@/lib/brand/site-branding'

/**
 * Async fragment that fetches settings and renders organization JSON-LD.
 * Isolated so the site layout can stay synchronous and avoid hydration mismatch
 * (server must emit the layout root <div> before any async children).
 */
export async function SiteLayoutJsonLd() {
  const headerStore = await headers()
  const cookieStore = await cookies()
  const activeBrand = resolveBrand({
    forwardedBrand: headerStore.get('x-brand'),
    cookieBrand: cookieStore.get('ih_active_brand')?.value ?? null,
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const brandConfig = getBrandSiteConfig(activeBrand)
  const brandUrl = getBrandSiteUrl(activeBrand)

  const settings = await getSettingsMap(undefined, { brandId: activeBrand })
  const organizationJsonLd = buildOrganizationJsonLd(settings, {
    name: brandConfig.title,
    url: brandUrl,
  })
  const webSiteJsonLd = buildWebSiteJsonLdWithOverrides(settings, {
    name: brandConfig.title,
    url: brandUrl,
  })

  if (!organizationJsonLd && !webSiteJsonLd) {
    return null
  }

  return (
    <>
      {organizationJsonLd ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      ) : null}
      {webSiteJsonLd ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
      ) : null}
    </>
  )
}
