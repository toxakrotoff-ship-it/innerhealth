import {
  normalizeBrandId,
  resolveBrandByHost,
  resolveBrandFromForwardedAndHost,
  type BrandId,
} from '@/lib/brand/brand';

export const ACTIVE_BRAND_COOKIE_NAME = 'ih_active_brand';
export const ADMIN_BRAND_COOKIE_NAME = 'ih_admin_brand';

interface ResolveBrandInput {
  forwardedBrand?: string | null;
  host?: string | null;
  /** @deprecated Ignored — storefront brand follows host (and `x-brand`). Kept for call-site compatibility. */
  activeBrandCookie?: string | null;
}

interface ResolveAdminBrandInput extends ResolveBrandInput {
  adminBrandCookie?: string | null;
}

/** Public site: proxy header `x-brand`, else hostname (cookie does not override domain). */
export function resolveSiteBrand({
  forwardedBrand,
  host,
}: ResolveBrandInput): BrandId {
  return resolveBrandFromForwardedAndHost(forwardedBrand, host);
}

/** Admin UI: `x-brand`, then admin/site brand cookies (switcher), then host. */
export function resolveAdminBrand({
  forwardedBrand,
  host,
  activeBrandCookie,
  adminBrandCookie,
}: ResolveAdminBrandInput): BrandId {
  const normalizedForwarded = normalizeBrandId(forwardedBrand);
  if (normalizedForwarded) return normalizedForwarded;
  const normalizedCookie = normalizeBrandId(adminBrandCookie ?? activeBrandCookie ?? null);
  if (normalizedCookie) return normalizedCookie;
  return resolveBrandByHost(host);
}
