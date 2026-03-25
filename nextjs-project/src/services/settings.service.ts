import 'server-only'
import { prisma } from '@/lib/prisma'
import {
  decryptSettingValue,
  encryptSettingValue,
  isSensitiveSettingKey,
} from '@/lib/settings-encryption'
import {
  isBrandScopedSettingKey,
  makeScopedSettingKey,
} from '@/lib/brand/brand-settings'
import type { BrandId } from '@/lib/brand/brand'

export const SETTING_KEYS = [
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
  'default_currency',
  'telegram_bot_token',
  'max_bot_token',
  'max_bot_mode',
  'max_bot_webhook_url',
  'max_bot_webhook_secret',
  'yandexMetrikaHeadCode',
  'yandexMetrikaBodyCode',
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

interface SettingsScopeOptions {
  brandId?: BrandId | null
}

type SettingsCacheEntry = {
  value: string
  expiresAt: number
}

const SETTINGS_CACHE_TTL_MS = (() => {
  const raw = Number(process.env.SETTINGS_CACHE_TTL_MS ?? '60000')
  return Number.isFinite(raw) && raw >= 0 ? raw : 60000
})()
const settingsCacheByKey = new Map<string, SettingsCacheEntry>()

/** Get settings as key-value map. Sensitive values are decrypted when read. */
export async function getSettingsMap(
  keys: readonly string[] = SETTING_KEYS,
  options: SettingsScopeOptions = {}
) {
  const now = Date.now()
  const scopedBrandId = options.brandId ?? null
  const storageKeyCandidatesByLogicalKey = new Map<string, string[]>()

  for (const key of keys) {
    if (scopedBrandId && isBrandScopedSettingKey(key)) {
      storageKeyCandidatesByLogicalKey.set(key, [
        makeScopedSettingKey(scopedBrandId, key),
        key,
      ])
      continue
    }
    storageKeyCandidatesByLogicalKey.set(key, [key])
  }

  const map: Record<string, string> = {}
  const missingKeys: Array<string> = []

  for (const [logicalKey, storageKeyCandidates] of Array.from(
    storageKeyCandidatesByLogicalKey.entries()
  )) {
    const cachedStorageKey = storageKeyCandidates.find((storageKey) => {
      const cached = settingsCacheByKey.get(storageKey)
      if (!cached || cached.expiresAt <= now) return false
      map[logicalKey] = cached.value
      return true
    })
    if (cachedStorageKey) {
      continue
    }
    map[logicalKey] = ''
    missingKeys.push(...storageKeyCandidates)
  }

  const uniqueMissingKeys = Array.from(new Set(missingKeys))
  if (uniqueMissingKeys.length > 0) {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: uniqueMissingKeys } },
    })

    const rowsByStorageKey = new Map<string, string>()
    for (const row of rows) {
      const value = isSensitiveSettingKey(row.key)
        ? decryptSettingValue(row.value)
        : row.value
      rowsByStorageKey.set(row.key, value)
      settingsCacheByKey.set(row.key, {
        value,
        expiresAt: now + SETTINGS_CACHE_TTL_MS,
      })
    }

    for (const [logicalKey, storageKeyCandidates] of Array.from(
      storageKeyCandidatesByLogicalKey.entries()
    )) {
      const resolvedValue = storageKeyCandidates
        .map((storageKey) => rowsByStorageKey.get(storageKey))
        .find((value) => value !== undefined)
      if (resolvedValue !== undefined) {
        map[logicalKey] = resolvedValue
      }
    }
  }

  return map
}

/** Upsert multiple settings. Sensitive values are encrypted before storage when SETTINGS_ENCRYPTION_KEY is set. */
export async function upsertSettings(
  body: Record<string, string>,
  keys: readonly string[] = [...SETTING_KEYS, ...SCHEMA_ORG_KEYS],
  options: SettingsScopeOptions = {}
) {
  const scopedBrandId = options.brandId ?? null
  for (const key of keys) {
    const value = body[key]
    if (value === undefined) continue
    const str = typeof value === 'string' ? value : String(value ?? '')
    const storageKey =
      scopedBrandId && isBrandScopedSettingKey(key)
        ? makeScopedSettingKey(scopedBrandId, key)
        : key
    const stored = isSensitiveSettingKey(key) ? encryptSettingValue(str) : str
    await prisma.siteSetting.upsert({
      where: { key: storageKey },
      create: { key: storageKey, value: stored },
      update: { value: stored },
    })
    settingsCacheByKey.set(storageKey, {
      value: str,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
    })
  }
  return getSettingsMap(keys, options)
}

/** Get Yookassa-related settings only. */
export const YOOKASSA_KEYS = [
  'yookassa_shop_id',
  'yookassa_secret_key',
  'yookassa_receipt_vat_code',
  'yookassa_receipt_vat_code_delivery',
] as const;

export async function getYookassaSettingsMap(options: SettingsScopeOptions = {}) {
  return getSettingsMap(YOOKASSA_KEYS, options);
}

/** Telegram bot token: из настроек админки или TELEGRAM_BOT_TOKEN. Для уведомлений и link-code. */
export async function getTelegramBotToken(options: SettingsScopeOptions = {}): Promise<string | undefined> {
  const fromEnv = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const map = await getSettingsMap(['telegram_bot_token'], options);
  const fromSettings = map.telegram_bot_token?.trim();
  return fromSettings || fromEnv || undefined;
}

export interface MaxBotSettings {
  token?: string;
  mode: 'polling' | 'webhook';
  webhookUrl?: string;
  webhookSecret?: string;
}

/** MAX bot settings from admin panel with env fallback. */
export async function getMaxBotSettings(options: SettingsScopeOptions = {}): Promise<MaxBotSettings> {
  const map = await getSettingsMap([
    'max_bot_token',
    'max_bot_mode',
    'max_bot_webhook_url',
    'max_bot_webhook_secret',
  ], options);

  const tokenFromAdmin = map.max_bot_token?.trim();
  const tokenFromEnv = process.env.MAX_BOT_TOKEN?.trim();

  const modeFromAdmin = map.max_bot_mode?.trim().toLowerCase();
  const modeFromEnv = process.env.MAX_BOT_MODE?.trim().toLowerCase();
  const modeCandidate = modeFromAdmin || modeFromEnv;
  const mode: 'polling' | 'webhook' = modeCandidate === 'webhook' ? 'webhook' : 'polling';

  const webhookUrlFromAdmin = map.max_bot_webhook_url?.trim();
  const webhookUrlFromEnv = process.env.MAX_BOT_WEBHOOK_URL?.trim();

  const webhookSecretFromAdmin = map.max_bot_webhook_secret?.trim();
  const webhookSecretFromEnv = process.env.MAX_BOT_WEBHOOK_SECRET?.trim();

  return {
    token: tokenFromAdmin || tokenFromEnv || undefined,
    mode,
    webhookUrl: webhookUrlFromAdmin || webhookUrlFromEnv || undefined,
    webhookSecret: webhookSecretFromAdmin || webhookSecretFromEnv || undefined,
  };
}

/** Ключи настроек СДЭК для OAuth (client_id + client_secret). */
export const CDEK_CREDENTIAL_KEYS = ['cdek_api_key', 'cdek_client_secret'] as const;

function parseBooleanSetting(value: string | undefined | null): boolean | null {
  const v = (value ?? '').trim().toLowerCase()
  if (v === '') return null
  if (v === '0' || v === 'false' || v === 'no' || v === 'n' || v === 'off') return false
  if (v === '1' || v === 'true' || v === 'yes' || v === 'y' || v === 'on') return true
  return null
}

/**
 * Учётные данные СДЭК для OAuth: только из настроек админки (SiteSetting).
 * Важно: намеренно НЕ используем env fallback, чтобы не получить неожиданный контур/ключи.
 */
export async function getCdekCredentials(options: SettingsScopeOptions = {}): Promise<{
  clientId: string;
  clientSecret: string;
  useTest: boolean;
} | null> {
  const map = await getSettingsMap([...CDEK_CREDENTIAL_KEYS, 'cdek_use_test'], options);
  const fromAdminId = map.cdek_api_key?.trim();
  const fromAdminSecret = map.cdek_client_secret?.trim();
  const useTestFromAdmin = parseBooleanSetting(map.cdek_use_test);
  const useTest = useTestFromAdmin ?? false;
  if (fromAdminId && fromAdminSecret) {
    return { clientId: fromAdminId, clientSecret: fromAdminSecret, useTest };
  }
  return null;
}
