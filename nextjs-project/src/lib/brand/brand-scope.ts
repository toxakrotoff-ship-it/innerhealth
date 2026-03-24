import type { BrandId } from '@/lib/brand/brand';

export const SPRINT_POWER_PRODUCT_BRAND = 'sprint-power';
export const SPRINT_POWER_PROMO_PREFIX = 'SP-';
export const SPRINT_POWER_CATEGORY_SLUG_PREFIX = 'sp-';
export const SPRINT_POWER_POST_SLUG_PREFIX = 'sp-';

export function isSprintPowerBrand(brandId: BrandId | null | undefined): boolean {
  return brandId === 'sprint-power';
}

export function normalizeProductBrandForScope(
  value: string | null | undefined,
  brandId: BrandId | null | undefined
): string | null | undefined {
  if (!isSprintPowerBrand(brandId)) return value;
  if (!value || !value.trim()) return SPRINT_POWER_PRODUCT_BRAND;
  return value.trim();
}

export function productBelongsToBrandScope(
  productBrand: string | null | undefined,
  brandId: BrandId | null | undefined
): boolean {
  if (isSprintPowerBrand(brandId)) return (productBrand ?? '').trim() === SPRINT_POWER_PRODUCT_BRAND;
  return (productBrand ?? '').trim() !== SPRINT_POWER_PRODUCT_BRAND;
}

export function promoBelongsToBrandScope(code: string, brandId: BrandId | null | undefined): boolean {
  if (isSprintPowerBrand(brandId)) return code.toUpperCase().startsWith(SPRINT_POWER_PROMO_PREFIX);
  return !code.toUpperCase().startsWith(SPRINT_POWER_PROMO_PREFIX);
}

export function normalizePromoCodeForScope(
  code: string,
  brandId: BrandId | null | undefined
): string {
  const trimmed = code.trim();
  if (!trimmed) return trimmed;
  if (isSprintPowerBrand(brandId)) {
    return trimmed.toUpperCase().startsWith(SPRINT_POWER_PROMO_PREFIX)
      ? trimmed
      : `${SPRINT_POWER_PROMO_PREFIX}${trimmed}`;
  }
  return trimmed.toUpperCase().startsWith(SPRINT_POWER_PROMO_PREFIX)
    ? trimmed.slice(SPRINT_POWER_PROMO_PREFIX.length)
    : trimmed;
}

export function categoryBelongsToBrandScope(
  slug: string,
  brandId: BrandId | null | undefined
): boolean {
  if (isSprintPowerBrand(brandId)) return slug.startsWith(SPRINT_POWER_CATEGORY_SLUG_PREFIX);
  return !slug.startsWith(SPRINT_POWER_CATEGORY_SLUG_PREFIX);
}

export function postBelongsToBrandScope(
  slug: string,
  brandId: BrandId | null | undefined
): boolean {
  if (isSprintPowerBrand(brandId)) return slug.startsWith(SPRINT_POWER_POST_SLUG_PREFIX);
  return !slug.startsWith(SPRINT_POWER_POST_SLUG_PREFIX);
}

export function normalizeCategorySlugForScope(
  slug: string,
  brandId: BrandId | null | undefined
): string {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return normalizedSlug;
  if (isSprintPowerBrand(brandId)) {
    return normalizedSlug.startsWith(SPRINT_POWER_CATEGORY_SLUG_PREFIX)
      ? normalizedSlug
      : `${SPRINT_POWER_CATEGORY_SLUG_PREFIX}${normalizedSlug}`;
  }
  return normalizedSlug.startsWith(SPRINT_POWER_CATEGORY_SLUG_PREFIX)
    ? normalizedSlug.slice(SPRINT_POWER_CATEGORY_SLUG_PREFIX.length)
    : normalizedSlug;
}

