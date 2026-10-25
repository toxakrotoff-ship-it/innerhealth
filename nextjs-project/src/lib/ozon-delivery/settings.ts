import 'server-only'
import { prisma } from '@/lib/prisma'
import { BRAND_IDS, type BrandId } from '@/lib/brand/brand'
import { OZON_BRAND_SCOPED_SETTING_KEYS, makeScopedSettingKey } from '@/lib/brand/brand-settings'
import { encryptSettingValue, isSensitiveSettingKey } from '@/lib/settings-encryption'
import { getSettingsMap } from '@/services/settings.service'

export const OZON_SETTING_KEYS = OZON_BRAND_SCOPED_SETTING_KEYS
export type OzonSettingKey = (typeof OZON_SETTING_KEYS)[number]
export type OzonSettings = Record<OzonSettingKey, string>

export class OzonSettingsError extends Error {}

/** Global defaults + optional brand overrides, using the same storage scope as CDEK. */
export async function readOzonSettings(brandId: BrandId | null): Promise<OzonSettings> {
  const map = await getSettingsMap(OZON_SETTING_KEYS, { brandId, fresh: true })
  return {
    ozon_enabled: ['1', 'true'].includes(map.ozon_enabled) ? '1' : '0',
    ozon_client_id: map.ozon_client_id?.trim() || '',
    ozon_client_secret: map.ozon_client_secret?.trim() || '',
    ozon_shipment_method_id: map.ozon_shipment_method_id?.trim() || '',
    ozon_handling_hours: map.ozon_handling_hours?.trim() || '24',
  }
}

export function parseOzonConnectionSettings(settings: OzonSettings) {
  const shipmentMethodId = Number(settings.ozon_shipment_method_id)
  const handlingHours = Number(settings.ozon_handling_hours)
  if (!settings.ozon_client_id || !settings.ozon_client_secret) {
    throw new OzonSettingsError('Укажите Client ID и Client Secret Ozon в настройках сайта')
  }
  if (!/^\d+$/.test(settings.ozon_shipment_method_id) || !Number.isSafeInteger(shipmentMethodId) || shipmentMethodId <= 0) {
    throw new OzonSettingsError('Укажите корректный ID метода доставки Ozon')
  }
  if (!Number.isFinite(handlingHours) || handlingHours < 1 || handlingHours > 168) {
    throw new OzonSettingsError('Срок передачи заказа Ozon должен быть от 1 до 168 часов')
  }
  return { clientId: settings.ozon_client_id, clientSecret: settings.ozon_client_secret, shipmentMethodId, handlingHours }
}

/** Secrets are never returned to the settings form. Blank input retains the saved secret. */
export function publicOzonSettings(settings: OzonSettings) {
  return { settings: { ...settings, ozon_client_secret: '' }, hasClientSecret: Boolean(settings.ozon_client_secret) }
}

export async function saveOzonSettings(
  updates: Partial<OzonSettings>, brandId: BrandId | null, applyToBoth = false
) {
  if (applyToBoth && brandId) throw new OzonSettingsError('Сохранение для обеих витрин доступно в режиме Global')
  const current = await readOzonSettings(brandId)
  const values = Object.fromEntries(Object.entries(updates).filter(([key, value]) =>
    (OZON_SETTING_KEYS as readonly string[]).includes(key) && (key !== 'ozon_client_secret' || value?.trim())
  )) as Partial<OzonSettings>
  const merged = { ...current, ...values }
  if (merged.ozon_enabled === '1') parseOzonConnectionSettings(merged)
  // Applying Global to both deliberately replaces existing overrides, including the saved secret.
  const scopes: Array<BrandId | null> = applyToBoth ? [null, ...BRAND_IDS] : [brandId]
  const entries = Object.entries(applyToBoth ? merged : values)
  const writes = scopes.flatMap(scope => entries.map(([key, value]) => {
    const storageKey = scope ? makeScopedSettingKey(scope, key) : key
    const stored = isSensitiveSettingKey(key) ? encryptSettingValue(value) : value
    return { storageKey, stored }
  }))
  await prisma.$transaction(writes.map(({ storageKey, stored }) => prisma.siteSetting.upsert({
    where: { key: storageKey }, create: { key: storageKey, value: stored }, update: { value: stored },
  })))
  return publicOzonSettings(await readOzonSettings(brandId))
}
