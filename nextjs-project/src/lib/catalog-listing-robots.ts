import type { ParsedCatalogSearch } from '@/lib/catalog-list-path'

/**
 * Robots policy for filtered/paginated catalog URLs to limit low-value index bloat.
 * Adjust thresholds as the assortment and filter usage grow.
 */
export function getCatalogListingRobots(params: {
  parsed: ParsedCatalogSearch
  /** Total products matching current filters (all pages). */
  matchingTotal: number
}): { index: boolean; follow: boolean } {
  const { parsed, matchingTotal } = params
  const q = parsed.q.trim()

  if (parsed.page > 5) {
    return { index: false, follow: true }
  }

  if (q.length > 0 && matchingTotal === 0) {
    return { index: false, follow: true }
  }

  if (parsed.brands.length >= 2) {
    return { index: false, follow: true }
  }

  return { index: true, follow: true }
}
