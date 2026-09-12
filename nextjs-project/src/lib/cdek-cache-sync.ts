import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCdekCities, getCdekToken, calculateCdekTariffList, resolveCdekSenderSettings } from '@/lib/cdek'
import * as settingsService from '@/services/settings.service'
import { OFFICES_PAGE_SIZE, OFFICES_MAX_PAGES } from '@/lib/cdek-widget-offices'

/**
 * Ночной прогрев кэша СДЭК (ПВЗ по регионам + тарифы по городам назначения).
 *
 * Идея: точка отправки статична (см. resolveCdekSenderSettings), поэтому весь
 * "тяжёлый" справочник — список ПВЗ по регионам РФ и цены доставки до
 * популярных городов — можно посчитать один раз в сутки в фоне, с щедрыми
 * ретраями, вместо того чтобы синхронно ждать ответ api.cdek.ru на чекауте
 * (где он иногда зависает на 1-2+ минуты — см. инцидент 11.09.2026).
 *
 * Раздача из этого кэша — в cdek-widget/service route.ts (офисы) и в
 * calculateForWidgetTariffs (тарифы); там же — фолбэк на живой запрос, если
 * региона/города ещё нет в кэше (редкий кейс, кэш дозаполнится следующей ночью).
 */

function buildCdekBaseUrl(useTest: boolean): string {
  return useTest ? 'https://api.edu.cdek.ru/v2' : 'https://api.cdek.ru/v2'
}

/** Весовые бакеты (верхняя граница, граммы) для прогрева тарифного кэша. */
export const CDEK_TARIFF_WEIGHT_BUCKETS_G = [300, 500, 1000, 2000, 3000, 5000, 8000, 12000, 20000]

/** Тарифы, которые прогреваем: 136 — ПВЗ (склад-склад), 137 — курьер до двери. */
const CDEK_WARM_TARIFF_CODES = [136, 137]

/**
 * Округляет фактический вес заказа вверх до ближайшего прогретого бакета.
 * Используется и при синхронизации (для ключа), и при чтении из кэша на чекауте.
 * Возвращает null, если вес превышает максимальный прогретый бакет — такой
 * заказ достаточно редкий/тяжёлый, чтобы считать его тариф вживую.
 */
export function resolveWeightBucketG(actualWeightG: number): number | null {
  for (const bucket of CDEK_TARIFF_WEIGHT_BUCKETS_G) {
    if (actualWeightG <= bucket) return bucket
  }
  return null
}

/** Габариты по умолчанию для синтетического расчёта (см. DEFAULT_PACKAGE_DEFAULTS в cdek.ts). */
const WARM_PACKAGE_DIMENSIONS_MM = { length: 33, width: 25, height: 15 }

/** Безопасная сеть городов для новых клиентов, у которых ещё нет истории заказов. */
const FALLBACK_WARM_CITY_NAMES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Красноярск',
  'Самара',
  'Уфа',
  'Ростов-на-Дону',
  'Краснодар',
  'Омск',
  'Воронеж',
  'Пермь',
  'Волгоград',
]

const SYNC_TIMEOUT_MS = 30_000
const SYNC_MAX_ATTEMPTS = 5
const REGION_CONCURRENCY = 4
const TARIFF_CONCURRENCY = 4

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(label: string, run: () => Promise<T>): Promise<T> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < SYNC_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      lastError = error
      const isLastAttempt = attempt === SYNC_MAX_ATTEMPTS - 1
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[cdek/cache-sync][retry] ${label}`, {
        attempt: attempt + 1,
        maxAttempts: SYNC_MAX_ATTEMPTS,
        message,
      })
      if (isLastAttempt) break
      // Экспоненциальный backoff: 2с, 4с, 8с, 16с (нет пользователя, который ждёт ответа).
      await sleep(Math.min(30_000, 2_000 * 2 ** attempt))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed after retries`)
}

async function fetchCdekJson(params: {
  url: string
  token: string
}): Promise<unknown> {
  const response = await fetch(params.url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${params.token}`,
      'X-App-Name': 'widget_pvz',
      'X-App-Version': '3.11.1',
    },
    signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`CDEK request failed: ${response.status} ${text.slice(0, 300)}`)
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(`CDEK response is not valid JSON: ${text.slice(0, 300)}`)
  }
}

interface CdekRegionEntry {
  regionCode: number
  regionName: string
}

/** GET /v2/location/regions?country_codes=RU — постранично, с ретраями. */
async function fetchAllRussianRegions(params: {
  baseUrl: string
  token: string
}): Promise<CdekRegionEntry[]> {
  const regions: CdekRegionEntry[] = []
  const pageSize = 200
  for (let page = 0; page < 20; page += 1) {
    const url = `${params.baseUrl}/location/regions?country_codes=RU&size=${pageSize}&page=${page}`
    const data = await withRetry(`location/regions page=${page}`, () =>
      fetchCdekJson({ url, token: params.token })
    )
    const list = Array.isArray(data) ? data : []
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue
      const entry = raw as Record<string, unknown>
      const regionCode = Number(entry.region_code)
      if (!Number.isFinite(regionCode) || regionCode <= 0) continue
      regions.push({ regionCode, regionName: String(entry.region ?? '') })
    }
    if (list.length < pageSize) break
  }
  // На случай дублей между страницами (не должно быть, но не доверяем API вслепую).
  const seen = new Map<number, CdekRegionEntry>()
  for (const region of regions) seen.set(region.regionCode, region)
  return Array.from(seen.values())
}

/** Полный дамп ПВЗ (is_handout=true) по одному региону, с пагинацией. */
async function fetchOfficesForRegion(params: {
  baseUrl: string
  token: string
  regionCode: number
}): Promise<unknown[]> {
  const items: unknown[] = []
  for (let page = 0; page < OFFICES_MAX_PAGES; page += 1) {
    const url =
      `${params.baseUrl}/deliverypoints?country_code=RU&type=PVZ&is_handout=true` +
      `&region_code=${params.regionCode}&page=${page}&size=${OFFICES_PAGE_SIZE}`
    const data = await withRetry(`deliverypoints region=${params.regionCode} page=${page}`, () =>
      fetchCdekJson({ url, token: params.token })
    )
    const pageItems = Array.isArray(data) ? data : []
    items.push(...pageItems)
    if (pageItems.length < OFFICES_PAGE_SIZE) break
  }
  return items
}

export interface CdekCacheSyncItemError {
  scope: 'region' | 'tariff-city'
  key: string
  message: string
}

export interface CdekCacheSyncSummary {
  ok: boolean
  regionsTotal: number
  regionsOk: number
  regionsFailed: number
  tariffCitiesTotal: number
  tariffCitiesOk: number
  tariffCitiesFailed: number
  durationMs: number
  errors: CdekCacheSyncItemError[]
}

async function mapWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0
  async function consume(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index]!)
    }
  }
  const workerCount = Math.min(Math.max(1, concurrency), items.length || 1)
  await Promise.all(Array.from({ length: workerCount }, () => consume()))
}

async function syncOneRegion(params: {
  baseUrl: string
  token: string
  region: CdekRegionEntry
  errors: CdekCacheSyncItemError[]
}): Promise<boolean> {
  const { baseUrl, token, region, errors } = params
  try {
    const items = await fetchOfficesForRegion({ baseUrl, token, regionCode: region.regionCode })
    await prisma.cdekOfficeCache.upsert({
      where: { regionCode: region.regionCode },
      create: {
        regionCode: region.regionCode,
        payload: items as Prisma.InputJsonValue,
        totalCount: items.length,
        isStale: false,
      },
      update: {
        payload: items as Prisma.InputJsonValue,
        totalCount: items.length,
        isStale: false,
      },
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cdek/cache-sync][region][failed]', { regionCode: region.regionCode, message })
    errors.push({ scope: 'region', key: `region:${region.regionCode}`, message })
    // Не затираем ранее успешный кэш нулевым результатом — только помечаем устаревшим.
    await prisma.cdekOfficeCache
      .updateMany({ where: { regionCode: region.regionCode }, data: { isStale: true } })
      .catch(() => {})
    return false
  }
}

/** Города для прогрева тарифов: история заказов/адресов + фиксированный список крупных городов. */
async function resolveWarmCityCodes(): Promise<number[]> {
  const sinceDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

  const [fromShipping, fromAddresses] = await Promise.all([
    prisma.shippingInfo.findMany({
      where: { cdekCityCode: { not: null }, updatedAt: { gte: sinceDate } },
      select: { cdekCityCode: true },
      distinct: ['cdekCityCode'],
      take: 2000,
    }),
    prisma.userAddress.findMany({
      where: { updatedAt: { gte: sinceDate } },
      select: { cdekCityCode: true },
      distinct: ['cdekCityCode'],
      take: 2000,
    }),
  ])

  const codes = new Set<number>()
  for (const row of fromShipping) {
    if (row.cdekCityCode != null) codes.add(row.cdekCityCode)
  }
  for (const row of fromAddresses) {
    codes.add(row.cdekCityCode)
  }

  await mapWithConcurrency(FALLBACK_WARM_CITY_NAMES, 3, async (cityName) => {
    try {
      const found = await withRetry(`location/cities name=${cityName}`, () =>
        getCdekCities({ city: cityName, country_codes: ['RU'], size: 1 })
      )
      const match = found.find((c) => c.city?.toLowerCase() === cityName.toLowerCase()) ?? found[0]
      if (match) codes.add(match.code)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[cdek/cache-sync][warm-city][resolve_failed]', { cityName, message })
    }
  })

  return Array.from(codes)
}

async function syncTariffsForCity(params: {
  cityCode: number
  fromLocation: { code: number; country_code: string }
  errors: CdekCacheSyncItemError[]
}): Promise<boolean> {
  const { cityCode, fromLocation, errors } = params
  let allOk = true

  for (const tariffCode of CDEK_WARM_TARIFF_CODES) {
    for (const weightBucketG of CDEK_TARIFF_WEIGHT_BUCKETS_G) {
      try {
        const tariffs = await withRetry(`tarifflist city=${cityCode} tariff=${tariffCode} w=${weightBucketG}`, () =>
          calculateCdekTariffList({
            from_location: fromLocation,
            to_location: { code: cityCode, country_code: 'RU' },
            packages: [{ weight: weightBucketG, ...WARM_PACKAGE_DIMENSIONS_MM }],
            tariff_codes: [tariffCode],
            type: 1,
            currency: 1,
            lang: 'rus',
          })
        )
        const result = tariffs[0]
        if (!result) {
          // Тарифа для этого города/веса может не существовать (например, курьер до двери
          // недоступен в отдалённом населённом пункте) — это не ошибка синхронизации.
          continue
        }
        await prisma.cdekTariffCache.upsert({
          where: {
            toCityCode_tariffCode_weightBucketG: { toCityCode: cityCode, tariffCode, weightBucketG },
          },
          create: {
            toCityCode: cityCode,
            tariffCode,
            weightBucketG,
            deliverySum: result.delivery_sum,
            periodMin: result.period_min,
            periodMax: result.period_max,
            isStale: false,
          },
          update: {
            deliverySum: result.delivery_sum,
            periodMin: result.period_min,
            periodMax: result.period_max,
            isStale: false,
          },
        })
      } catch (error) {
        allOk = false
        const message = error instanceof Error ? error.message : String(error)
        console.error('[cdek/cache-sync][tariff][failed]', { cityCode, tariffCode, weightBucketG, message })
        errors.push({
          scope: 'tariff-city',
          key: `city:${cityCode}:tariff:${tariffCode}:w:${weightBucketG}`,
          message,
        })
        await prisma.cdekTariffCache
          .updateMany({
            where: { toCityCode: cityCode, tariffCode, weightBucketG },
            data: { isStale: true },
          })
          .catch(() => {})
      }
    }
  }

  return allOk
}

export async function runCdekCacheSync(): Promise<CdekCacheSyncSummary> {
  const startedAt = Date.now()
  const errors: CdekCacheSyncItemError[] = []

  const credentials = await settingsService.getCdekCredentials({})
  if (!credentials) {
    throw new Error('CDEK credentials are missing in admin settings')
  }
  const baseUrl = buildCdekBaseUrl(credentials.useTest)
  const token = await getCdekToken(credentials)

  const senderSettingsResult = await resolveCdekSenderSettings({
    overrideCredentials: credentials,
    validatePvzCity: false,
  })
  if (!senderSettingsResult.ok) {
    const message =
      'error' in senderSettingsResult ? senderSettingsResult.error : 'CDEK sender settings error'
    throw new Error(`CDEK sender settings error: ${message}`)
  }
  const fromLocation = {
    code: senderSettingsResult.settings.fromCityCode,
    country_code: 'RU',
  }

  // 1) Регионы + ПВЗ.
  const regions = await withRetry('location/regions', () => fetchAllRussianRegions({ baseUrl, token }))

  let regionsOk = 0
  let regionsFailed = 0
  await mapWithConcurrency(regions, REGION_CONCURRENCY, async (region) => {
    const ok = await syncOneRegion({ baseUrl, token, region, errors })
    if (ok) regionsOk += 1
    else regionsFailed += 1
  })

  // 2) Тарифы до популярных/реально используемых городов.
  const warmCityCodes = await resolveWarmCityCodes()

  let tariffCitiesOk = 0
  let tariffCitiesFailed = 0
  await mapWithConcurrency(warmCityCodes, TARIFF_CONCURRENCY, async (cityCode) => {
    const ok = await syncTariffsForCity({ cityCode, fromLocation, errors })
    if (ok) tariffCitiesOk += 1
    else tariffCitiesFailed += 1
  })

  const summary: CdekCacheSyncSummary = {
    ok: regionsFailed === 0 && tariffCitiesFailed === 0,
    regionsTotal: regions.length,
    regionsOk,
    regionsFailed,
    tariffCitiesTotal: warmCityCodes.length,
    tariffCitiesOk,
    tariffCitiesFailed,
    durationMs: Date.now() - startedAt,
    // Каждый город обходится ~2 тарифа * 9 весовых бакетов = до 18 ошибок; не раздуваем лог сверх меры.
    errors: errors.slice(0, 50),
  }

  await prisma.cdekCacheSyncRun.create({
    data: {
      startedAt: new Date(startedAt),
      finishedAt: new Date(),
      ok: summary.ok,
      regionsTotal: summary.regionsTotal,
      regionsOk: summary.regionsOk,
      regionsFailed: summary.regionsFailed,
      tariffCitiesTotal: summary.tariffCitiesTotal,
      tariffCitiesOk: summary.tariffCitiesOk,
      tariffCitiesFailed: summary.tariffCitiesFailed,
      errors: summary.errors as unknown as Prisma.InputJsonValue,
    },
  })

  return summary
}
