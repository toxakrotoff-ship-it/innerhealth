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

/** Hostname contains a configured substring (e.g. innerhealth, sprint) — brand is locked to {@link resolveBrandByHost}. */
export function hostHasBrandDomainHint(host: string | null | undefined): boolean {
  const normalizedHost = (host ?? '').trim().toLowerCase();
  if (!normalizedHost) return false;
  return BRAND_DEFINITIONS.some((brand) =>
    brand.hostHints.some((hint) => normalizedHost.includes(hint))
  );
}

/**
 * Public SSR: on domains with a brand hint, host wins over `x-brand`.
 * On ambiguous hosts (preview, docker service name), `x-brand` may disambiguate.
 */
export function resolveBrandFromForwardedAndHost(
  forwardedBrand: string | null | undefined,
  host: string | null | undefined
): BrandId {
  if (hostHasBrandDomainHint(host)) {
    return resolveBrandByHost(host);
  }
  const normalizedForwardedBrand = normalizeBrandId(forwardedBrand);
  if (normalizedForwardedBrand) return normalizedForwardedBrand;
  return resolveBrandByHost(host);
}

/**
 * Legacy three-arg helper for server components. `cookieBrand` is ignored — use {@link resolveBrandFromForwardedAndHost}
 * or `resolveSiteBrand` / `resolveAdminBrand` from `brand-context`.
 */
export function resolveBrand(input: {
  host?: string | null;
  forwardedBrand?: string | null;
  cookieBrand?: string | null;
}): BrandId {
  return resolveBrandFromForwardedAndHost(input.forwardedBrand, input.host);
}

