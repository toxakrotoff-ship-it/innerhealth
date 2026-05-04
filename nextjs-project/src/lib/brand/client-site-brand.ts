import {
  hostHasBrandDomainHint,
  normalizeBrandId,
  resolveBrandByHost,
  type BrandId,
} from '@/lib/brand/brand'

/**
 * Browser-only: matches `resolveBrandOrDefaultFromRequest` — branded domains lock to host;
 * ambiguous hosts allow `?brand=` (never `ih_active_brand`).
 */
export function resolveClientSiteBrandFromWindow(): BrandId {
  if (typeof window === 'undefined') return 'inner'
  const host = window.location.host
  if (hostHasBrandDomainHint(host)) {
    return resolveBrandByHost(host)
  }
  const fromQuery = normalizeBrandId(new URLSearchParams(window.location.search).get('brand'))
  if (fromQuery) return fromQuery
  return resolveBrandByHost(host)
}
