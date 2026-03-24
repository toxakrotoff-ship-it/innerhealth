export const BRAND_IDS = ['inner', 'sprint-power'] as const;

export type BrandId = (typeof BRAND_IDS)[number];

export interface BrandDefinition {
  id: BrandId;
  label: string;
  hostHints: readonly string[];
}

const BRAND_DEFINITIONS: readonly BrandDefinition[] = [
  {
    id: 'inner',
    label: 'Inner Health',
    hostHints: ['inner', 'innerhealth'],
  },
  {
    id: 'sprint-power',
    label: 'Sprint Power',
    hostHints: ['sprint', 'sprintpower'],
  },
] as const;

export function getBrandDefinitions(): readonly BrandDefinition[] {
  return BRAND_DEFINITIONS;
}

export function isBrandId(value: string): value is BrandId {
  return BRAND_IDS.includes(value as BrandId);
}

export function normalizeBrandId(value: string | null | undefined): BrandId | null {
  if (!value) return null;
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return null;
  return isBrandId(normalizedValue) ? normalizedValue : null;
}

export function resolveBrandByHost(host: string | null | undefined): BrandId {
  const normalizedHost = (host ?? '').trim().toLowerCase();
  if (!normalizedHost) return 'inner';

  const match = BRAND_DEFINITIONS.find((brand) =>
    brand.hostHints.some((hint) => normalizedHost.includes(hint))
  );

  return match?.id ?? 'inner';
}

export function resolveBrand({
  host,
  forwardedBrand,
  cookieBrand,
}: {
  host?: string | null;
  forwardedBrand?: string | null;
  cookieBrand?: string | null;
}): BrandId {
  const normalizedForwardedBrand = normalizeBrandId(forwardedBrand);
  if (normalizedForwardedBrand) return normalizedForwardedBrand;

  const normalizedCookieBrand = normalizeBrandId(cookieBrand);
  if (normalizedCookieBrand) return normalizedCookieBrand;

  return resolveBrandByHost(host);
}

