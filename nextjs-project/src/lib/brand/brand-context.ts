import { resolveBrand, type BrandId } from '@/lib/brand/brand';

export const ACTIVE_BRAND_COOKIE_NAME = 'ih_active_brand';
export const ADMIN_BRAND_COOKIE_NAME = 'ih_admin_brand';

interface ResolveBrandInput {
  forwardedBrand?: string | null;
  host?: string | null;
  activeBrandCookie?: string | null;
}

interface ResolveAdminBrandInput extends ResolveBrandInput {
  adminBrandCookie?: string | null;
}

export function resolveSiteBrand({
  forwardedBrand,
  host,
  activeBrandCookie,
}: ResolveBrandInput): BrandId {
  return resolveBrand({
    forwardedBrand,
    host,
    cookieBrand: activeBrandCookie ?? null,
  });
}

export function resolveAdminBrand({
  forwardedBrand,
  host,
  activeBrandCookie,
  adminBrandCookie,
}: ResolveAdminBrandInput): BrandId {
  return resolveBrand({
    forwardedBrand,
    host,
    cookieBrand: adminBrandCookie ?? activeBrandCookie ?? null,
  });
}
