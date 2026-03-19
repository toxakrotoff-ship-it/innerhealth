import { getSettingsMap } from '@/services/settings.service'
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/lib/schema-org'

/**
 * Async fragment that fetches settings and renders organization JSON-LD.
 * Isolated so the site layout can stay synchronous and avoid hydration mismatch
 * (server must emit the layout root <div> before any async children).
 */
export async function SiteLayoutJsonLd() {
  const settings = await getSettingsMap()
  const organizationJsonLd = buildOrganizationJsonLd(settings)
  const webSiteJsonLd = buildWebSiteJsonLd(settings)

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
