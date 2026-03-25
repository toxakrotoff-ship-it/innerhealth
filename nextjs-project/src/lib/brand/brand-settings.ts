import { isBrandId, type BrandId } from '@/lib/brand/brand';

export const BRAND_SCOPED_SETTING_KEYS = [
  'cdek_api_key',
  'cdek_client_secret',
  'cdek_use_test',
  'cdek_sender_name',
  'cdek_sender_phone',
  'cdek_sender_address',
  'cdek_from_pvz_code',
  'cdek_from_city_code',
  'cdek_default_package_weight_g',
  'cdek_default_package_length_mm',
  'cdek_default_package_width_mm',
  'cdek_default_package_height_mm',
  'cdek_preferred_tariff_code_pvz',
  'cdek_preferred_tariff_code_address',
  'yookassa_shop_id',
  'yookassa_secret_key',
  'yookassa_term_id',
  'yookassa_receipt_vat_code',
  'yookassa_receipt_vat_code_delivery',
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

