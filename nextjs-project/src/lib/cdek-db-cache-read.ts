import 'server-only'
import { prisma } from '@/lib/prisma'
import { resolveWeightBucketG } from '@/lib/cdek-cache-sync'
import { enrichTariffResult, type CdekTariffResult } from '@/lib/cdek'

/**
 * Read-путь для ночного Postgres-кэша СДЭК (см. cdek-cache-sync.ts).
 * Используется в cdek-widget/service route.ts как первый (и в норме единственный)
 * источник данных на чекауте — без похода в api.cdek.ru.
 */

export interface RegionOfficesCacheHit {
  payload: unknown[]
  totalCount: number
  isStale: boolean
  updatedAt: Date
}

export async function getRegionOfficesFromDb(regionCode: number): Promise<RegionOfficesCacheHit | null> {
  const row = await prisma.cdekOfficeCache.findUnique({ where: { regionCode } })
  if (!row) return null
  const payload = Array.isArray(row.payload) ? (row.payload as unknown[]) : []
  return {
    payload,
    totalCount: row.totalCount,
    isStale: row.isStale,
    updatedAt: row.updatedAt,
  }
}

export interface TariffCacheHit {
  deliverySum: number
  periodMin: number
  periodMax: number
  isStale: boolean
}

/**
 * Ищет прогретый тариф по фактическому весу заказа, округляя вверх до ближайшего
 * прогретого бакета (см. resolveWeightBucketG). Возвращает null, если города нет
 * в кэше или вес превышает максимальный прогретый бакет — вызывающий код должен
 * в этом случае откатиться на живой запрос к api.cdek.ru.
 */
export async function getTariffFromDb(params: {
  toCityCode: number
  tariffCode: number
  actualWeightG: number
}): Promise<TariffCacheHit | null> {
  const weightBucketG = resolveWeightBucketG(params.actualWeightG)
  if (weightBucketG == null) return null

  const row = await prisma.cdekTariffCache.findUnique({
    where: {
      toCityCode_tariffCode_weightBucketG: {
        toCityCode: params.toCityCode,
        tariffCode: params.tariffCode,
        weightBucketG,
      },
    },
  })
  if (!row) return null

  return {
    deliverySum: row.deliverySum,
    periodMin: row.periodMin,
    periodMax: row.periodMax,
    isStale: row.isStale,
  }
}

export function tariffCacheHitToResult(hit: TariffCacheHit, tariffCode: number): CdekTariffResult {
  // Виджет СДЭК раскладывает тарифы по delivery_mode; без него тариф отбрасывается
  // и показывается «Не могу посчитать стоимость».
  return enrichTariffResult(
    {
      tariff_code: tariffCode,
      delivery_sum: hit.deliverySum,
      period_min: hit.periodMin,
      period_max: hit.periodMax,
    },
    tariffCode
  )
}
