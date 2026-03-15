import { getSettingsMap } from '@/services/settings.service'
import { buildOrganizationJsonLd } from '@/lib/schema-org'

/**
 * Async fragment that fetches settings and renders organization JSON-LD.
 * Isolated so the site layout can stay synchronous and avoid hydration mismatch
 * (server must emit the layout root <div> before any async children).
 */
export async function SiteLayoutJsonLd() {
  const settings = await getSettingsMap()
  const organizationJsonLd = buildOrganizationJsonLd(settings)

  if (!organizationJsonLd) {
    return null
  }

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
    />
  )
}
