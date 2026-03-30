import { isBrandId, type BrandId } from '@/lib/brand/brand';

export const BRAND_SCOPED_SETTING_KEYS = [
  'site_name',
  'site_contact_email',
  'telegram_bot_token',
  'max_bot_token',
  'max_bot_mode',
  'max_bot_webhook_url',
  'max_bot_webhook_secret',
  'yandexMetrikaHeadCode',
  'yandexMetrikaBodyCode',
  'schema_org_enabled',
  'schema_org_organization_type',
  'schema_org_legal_name',
  'schema_org_url',
  'schema_org_logo_url',
  'schema_org_phone',
  'schema_org_address',
  'schema_org_social_links',
] as const;

const brandScopedSettingKeySet = new Set<string>(BRAND_SCOPED_SETTING_KEYS);

export function isBrandScopedSettingKey(key: string): boolean {
  return brandScopedSettingKeySet.has(key);
}

export function makeScopedSettingKey(brandId: BrandId, key: string): string {
  return `${brandId}:${key}`;
}

export function parseBrandFromSearchParams(searchParams: URLSearchParams): BrandId | null {
  const raw = searchParams.get('brand');
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  return isBrandId(normalized) ? normalized : null;
}
