import type { BrandId } from '@/lib/brand/brand';
import { normalizeBrandId, resolveBrand } from '@/lib/brand/brand';

const ACTIVE_BRAND_COOKIE_NAME = 'ih_active_brand';

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

export function resolveBrandFromRequest(request: Request): BrandId | null {
  const url = new URL(request.url);
  const fromQuery = normalizeBrandId(url.searchParams.get('brand'));
  if (fromQuery) return fromQuery;

  const fromCookie = normalizeBrandId(
    getCookieValue(request.headers.get('cookie'), ACTIVE_BRAND_COOKIE_NAME)
  );
  if (fromCookie) return fromCookie;

  return null;
}

export function resolveBrandOrDefaultFromRequest(request: Request): BrandId {
  const fromExplicitScope = resolveBrandFromRequest(request);
  if (fromExplicitScope) return fromExplicitScope;

  const fromForwardedBrand = normalizeBrandId(request.headers.get('x-brand'));
  if (fromForwardedBrand) return fromForwardedBrand;

  return resolveBrand({
    forwardedBrand: request.headers.get('x-brand'),
    cookieBrand: getCookieValue(request.headers.get('cookie'), ACTIVE_BRAND_COOKIE_NAME),
    host: request.headers.get('x-forwarded-host') || request.headers.get('host'),
  });
}

