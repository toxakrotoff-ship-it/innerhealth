import 'server-only';
import { prisma } from '@/lib/prisma';

export const SETTING_KEYS = [
  'cdek_api_key',
  'cdek_sender_name',
  'cdek_sender_phone',
  'cdek_sender_address',
  'cdek_from_city_code',
  'yookassa_shop_id',
  'yookassa_secret_key',
  'yookassa_term_id',
  'yookassa_receipt_vat_code',
  'yookassa_receipt_vat_code_delivery',
  'site_name',
  'site_contact_email',
  'default_currency',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/** Get settings as key-value map. */
export async function getSettingsMap(keys: readonly string[] = SETTING_KEYS) {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [...keys] } },
  });
  const map: Record<string, string> = {};
  for (const k of keys) {
    map[k] = '';
  }
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

/** Upsert multiple settings. */
export async function upsertSettings(
  body: Record<string, string>,
  keys: readonly string[] = SETTING_KEYS
) {
  for (const key of keys) {
    const value = body[key];
    if (value === undefined) continue;
    const str = typeof value === 'string' ? value : String(value ?? '');
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: str },
      update: { value: str },
    });
  }
  return getSettingsMap(keys);
}

/** Get Yookassa-related settings only. */
export const YOOKASSA_KEYS = [
  'yookassa_shop_id',
  'yookassa_secret_key',
  'yookassa_receipt_vat_code',
  'yookassa_receipt_vat_code_delivery',
] as const;

export async function getYookassaSettingsMap() {
  return getSettingsMap(YOOKASSA_KEYS);
}
