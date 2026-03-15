import 'server-only'
import { prisma } from '@/lib/prisma'
import {
  decryptSettingValue,
  encryptSettingValue,
  isSensitiveSettingKey,
} from '@/lib/settings-encryption'

export const SETTING_KEYS = [
  'cdek_api_key',
  'cdek_client_secret',
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
  'telegram_bot_token',
] as const

export const SCHEMA_ORG_KEYS = [
  'schema_org_enabled',
  'schema_org_organization_type',
  'schema_org_legal_name',
  'schema_org_url',
  'schema_org_logo_url',
  'schema_org_phone',
  'schema_org_address',
  'schema_org_social_links',
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]

/** Get settings as key-value map. Sensitive values are decrypted when read. */
export async function getSettingsMap(keys: readonly string[] = SETTING_KEYS) {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [...keys] } },
  })
  const map: Record<string, string> = {}
  for (const k of keys) {
    map[k] = ''
  }
  for (const row of rows) {
    const value = isSensitiveSettingKey(row.key)
      ? decryptSettingValue(row.value)
      : row.value
    map[row.key] = value
  }
  return map
}

/** Upsert multiple settings. Sensitive values are encrypted before storage when SETTINGS_ENCRYPTION_KEY is set. */
export async function upsertSettings(
  body: Record<string, string>,
  keys: readonly string[] = [...SETTING_KEYS, ...SCHEMA_ORG_KEYS]
) {
  for (const key of keys) {
    const value = body[key]
    if (value === undefined) continue
    const str = typeof value === 'string' ? value : String(value ?? '')
    const stored = isSensitiveSettingKey(key) ? encryptSettingValue(str) : str
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: stored },
      update: { value: stored },
    })
  }
  return getSettingsMap(keys)
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

/** Telegram bot token: из настроек админки или TELEGRAM_BOT_TOKEN. Для уведомлений и link-code. */
export async function getTelegramBotToken(): Promise<string | undefined> {
  const fromEnv = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const map = await getSettingsMap(['telegram_bot_token']);
  const fromSettings = map.telegram_bot_token?.trim();
  return fromSettings || fromEnv || undefined;
}

/** Ключи настроек СДЭК для OAuth (client_id + client_secret). */
export const CDEK_CREDENTIAL_KEYS = ['cdek_api_key', 'cdek_client_secret'] as const;

/**
 * Учётные данные СДЭК для OAuth: из настроек админки (если заданы оба поля) или из env.
 */
export async function getCdekCredentials(): Promise<{
  clientId: string;
  clientSecret: string;
} | null> {
  const map = await getSettingsMap([...CDEK_CREDENTIAL_KEYS]);
  const fromAdminId = map.cdek_api_key?.trim();
  const fromAdminSecret = map.cdek_client_secret?.trim();
  if (fromAdminId && fromAdminSecret) {
    return { clientId: fromAdminId, clientSecret: fromAdminSecret };
  }
  const fromEnvId = process.env.CDEK_CLIENT_ID ?? process.env.CDEK_ACCOUNT;
  const fromEnvSecret = process.env.CDEK_CLIENT_SECRET ?? process.env.CDEK_SECURE;
  if (fromEnvId?.trim() && fromEnvSecret?.trim()) {
    return { clientId: fromEnvId.trim(), clientSecret: fromEnvSecret.trim() };
  }
  return null;
}
