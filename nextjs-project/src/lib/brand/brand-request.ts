import type { BrandId } from '@/lib/brand/brand';
import {
  hostHasBrandDomainHint,
  normalizeBrandId,
  resolveBrandByHost,
} from '@/lib/brand/brand';
import {
  ACTIVE_BRAND_COOKIE_NAME,
  ADMIN_BRAND_COOKIE_NAME,
} from '@/lib/brand/brand-context';

function getCookieValue(rawCookieHeader: string | null, key: string): string | null {
  if (!rawCookieHeader) return null;
  const pairs = rawCookieHeader.split(';');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex < 0) continue;
    const cookieKey = trimmed.slice(0, eqIndex).trim();
    if (cookieKey !== key) continue;
    return decodeURIComponent(trimmed.slice(eqIndex + 1).trim());
  }
  return null;
}

/** Admin panel HTTP APIs: `?brand`, `x-brand`, then admin/active cookies, then host. */
export function resolveAdminBrandFromRequest(request: Request): BrandId {
  const url = new URL(request.url);
  const fromQuery = normalizeBrandId(url.searchParams.get('brand'));
  if (fromQuery) return fromQuery;

  const fromForwarded = normalizeBrandId(request.headers.get('x-brand'));
  if (fromForwarded) return fromForwarded;

  const cookieHeader = request.headers.get('cookie');
  const fromAdminCookie = normalizeBrandId(getCookieValue(cookieHeader, ADMIN_BRAND_COOKIE_NAME));
  if (fromAdminCookie) return fromAdminCookie;
  const fromActiveCookie = normalizeBrandId(getCookieValue(cookieHeader, ACTIVE_BRAND_COOKIE_NAME));
  if (fromActiveCookie) return fromActiveCookie;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return resolveBrandByHost(host);
}

/**
 * Public / storefront APIs: on real branded domains, brand follows Host only (no cookie;
 * `?brand` / `x-brand` cannot override a conflicting domain).
 */
export function resolveBrandOrDefaultFromRequest(request: Request): BrandId {
  const host =
    (request.headers.get('x-forwarded-host') || request.headers.get('host')) ?? '';
  const hostBrand = resolveBrandByHost(host);

  if (hostHasBrandDomainHint(host)) {
    return hostBrand;
  }

  const url = new URL(request.url);
  const fromQuery = normalizeBrandId(url.searchParams.get('brand'));
  if (fromQuery) return fromQuery;

  const fromForwarded = normalizeBrandId(request.headers.get('x-brand'));
  if (fromForwarded) return fromForwarded;

  return hostBrand;
}

