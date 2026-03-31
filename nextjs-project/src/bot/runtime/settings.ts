import { prisma } from '@/lib/prisma';
import {
  decryptSettingValue,
  isEncryptedSettingValue,
  isSensitiveSettingStorageKey,
} from '@/lib/settings-encryption';
import {
  isBrandScopedSettingKey,
  makeScopedSettingKey,
} from '@/lib/brand/brand-settings';
import type { BrandId } from '@/lib/brand/brand';

interface SettingsScopeOptions {
  brandId?: BrandId | null;
}

export interface RuntimeMaxBotSettings {
  token?: string;
  mode: 'polling' | 'webhook';
  webhookUrl?: string;
  webhookSecret?: string;
}

function getStorageKeyCandidates(logicalKey: string, brandId?: BrandId | null): string[] {
  if (brandId && isBrandScopedSettingKey(logicalKey)) {
    return [makeScopedSettingKey(brandId, logicalKey), logicalKey];
  }
  return [logicalKey];
}

function decodeStoredSettingValue(storageKey: string, rawValue: string): string {
  if (!isSensitiveSettingStorageKey(storageKey)) return rawValue;
  const decryptedValue = decryptSettingValue(rawValue);
  if (rawValue !== '' && isEncryptedSettingValue(decryptedValue)) {
    console.error(
      `[bot-runtime/settings] sensitive key "${storageKey}" could not be decrypted. Check SETTINGS_ENCRYPTION_KEY.`
    );
    return '';
  }
  return decryptedValue;
}

export async function getRuntimeSettingsMap(
  keys: readonly string[],
  options: SettingsScopeOptions = {}
): Promise<Record<string, string>> {
  const candidateKeyMap = new Map<string, string[]>();
  const storageKeys = new Set<string>();

  for (const key of keys) {
    const candidates = getStorageKeyCandidates(key, options.brandId);
    candidateKeyMap.set(key, candidates);
    for (const candidate of candidates) storageKeys.add(candidate);
  }

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: Array.from(storageKeys) } },
    select: { key: true, value: true },
  });

  const valuesByStorageKey = new Map<string, string>();
  for (const row of rows) {
    valuesByStorageKey.set(row.key, decodeStoredSettingValue(row.key, row.value));
  }

  const resolved: Record<string, string> = {};
  for (const [logicalKey, candidates] of Array.from(candidateKeyMap.entries())) {
    resolved[logicalKey] =
      candidates.map((candidate) => valuesByStorageKey.get(candidate)).find((value) => value !== undefined) ?? '';
  }

  return resolved;
}

export async function getTelegramBotToken(
  options: SettingsScopeOptions = {}
): Promise<string | undefined> {
  const map = await getRuntimeSettingsMap(['telegram_bot_token'], options);
  const token = map.telegram_bot_token?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  return token || undefined;
}

export async function getMaxBotSettings(
  options: SettingsScopeOptions = {}
): Promise<RuntimeMaxBotSettings> {
  const map = await getRuntimeSettingsMap(
    ['max_bot_token', 'max_bot_mode', 'max_bot_webhook_url', 'max_bot_webhook_secret'],
    options
  );

  const modeRaw = (map.max_bot_mode || process.env.MAX_BOT_MODE || '').trim().toLowerCase();
  return {
    token: map.max_bot_token?.trim() || process.env.MAX_BOT_TOKEN?.trim() || undefined,
    mode: modeRaw === 'webhook' ? 'webhook' : 'polling',
    webhookUrl: map.max_bot_webhook_url?.trim() || process.env.MAX_BOT_WEBHOOK_URL?.trim() || undefined,
    webhookSecret:
      map.max_bot_webhook_secret?.trim() || process.env.MAX_BOT_WEBHOOK_SECRET?.trim() || undefined,
  };
}
