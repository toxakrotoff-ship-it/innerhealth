import { buildBreadcrumbListJsonLd } from '@/lib/schema-org'
import { getSiteBaseUrl } from '@/lib/site-url'

interface BreadcrumbJsonLdProps {
  items: { label: string; href?: string }[]
  /** Path + query of current page, e.g. /catalog?page=2 */
  currentPath: string
}

export function BreadcrumbJsonLd({ items, currentPath }: BreadcrumbJsonLdProps) {
  const json = buildBreadcrumbListJsonLd({
    items,
    currentPath,
    siteOrigin: getSiteBaseUrl(),
  })
  if (!json) return null
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
