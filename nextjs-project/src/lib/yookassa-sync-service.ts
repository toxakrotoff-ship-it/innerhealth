import 'server-only'
import type { BrandId } from '@/lib/brand/brand'
import { getYookassaPayment } from '@/lib/yookassa'
import {
  transitionOrderToCanceled,
  transitionOrderToPaid,
  type OrderPaymentTransitionSource,
} from '@/lib/order-payment-flow'
import * as orderService from '@/services/order.service'
import * as settingsService from '@/services/settings.service'

/**
 * Шкала throttle для крон-поллера. Сравнивается с возрастом заказа от createdAt.
 * При `now - yookassaCheckedAt < intervalMs` заказ пропускается.
 *
 * Логика: чем «свежее» заказ, тем чаще опрос; через 7 дней — стоп
 * (платёж в ЮKassa уже не оплатят, payment expires в течение этого периода).
 */
export interface PollThrottleTier {
  /** Включительно: заказы с возрастом меньше этого значения попадают в этот ярус. */
  ageLessThanMs: number
  /** Минимальный интервал между проверками для заказов этого яруса. */
  intervalMs: number
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const DEFAULT_POLL_THROTTLE_TIERS: ReadonlyArray<PollThrottleTier> = [
  { ageLessThanMs: 30 * MINUTE, intervalMs: 0 },        // первые 30 мин — каждый прогон
  { ageLessThanMs: 6 * HOUR,    intervalMs: 5 * MINUTE }, // 30 мин – 6 ч → не чаще 5 мин
  { ageLessThanMs: DAY,         intervalMs: 15 * MINUTE }, // 6 ч – 24 ч → 15 мин
  { ageLessThanMs: 7 * DAY,     intervalMs: HOUR },     // 24 ч – 7 д → 1 ч
]

/**
 * Возвращает минимальный интервал между опросами для заказа этого возраста.
 * Если возраст заказа выше всех ярусов — возвращает Infinity (не опрашиваем).
 */
export function getThrottleIntervalForAge(
  ageMs: number,
  tiers: ReadonlyArray<PollThrottleTier> = DEFAULT_POLL_THROTTLE_TIERS
): number {
  for (const tier of tiers) {
    if (ageMs < tier.ageLessThanMs) return tier.intervalMs
  }
  return Number.POSITIVE_INFINITY
}

/**
 * Должен ли быть выполнен опрос ЮKassa для заказа с заданным возрастом
 * и временем последней проверки?
 */
export function shouldPollOrder(args: {
  createdAt: Date
  yookassaCheckedAt: Date | null
  now?: Date
  tiers?: ReadonlyArray<PollThrottleTier>
}): boolean {
  const now = args.now ?? new Date()
  const ageMs = now.getTime() - args.createdAt.getTime()
  const interval = getThrottleIntervalForAge(ageMs, args.tiers)
  if (!Number.isFinite(interval)) return false
  if (!args.yookassaCheckedAt) return true
  const sinceLastCheck = now.getTime() - args.yookassaCheckedAt.getTime()
  return sinceLastCheck >= interval
}

export interface SyncOnePendingOrderResult {
  orderId: string
  paymentId: string
  paymentStatus: string | null
  previousOrderStatus: string
  orderStatus: string
  updated: boolean
  throttled?: boolean
  error?: string
}

interface SyncCandidate {
  id: string
  status: string
  createdAt: Date
  yookassaPaymentId: string
  yookassaCheckedAt: Date | null
  brand: BrandId
}

/**
 * Опрашивает один заказ в ЮKassa и переводит его в `paid` / `canceled` при необходимости.
 * Использует общий `transitionOrderToPaid` / `transitionOrderToCanceled`,
 * чтобы и крон, и ручная кнопка вызывали полный набор сайд-эффектов.
 */
export async function syncOnePendingOrder(
  candidate: SyncCandidate,
  source: OrderPaymentTransitionSource,
  credentialsResolver: (brandId: BrandId) => Promise<{ shopId: string; secretKey: string } | undefined>
): Promise<SyncOnePendingOrderResult> {
  const previousOrderStatus = candidate.status
  const paymentId = candidate.yookassaPaymentId
  try {
    const credentials = await credentialsResolver(candidate.brand)
    const payment = await getYookassaPayment(paymentId, credentials)
    await orderService.markYookassaChecked(candidate.id).catch((e) =>
      console.error('[yookassa-sync] markYookassaChecked failed', candidate.id, e)
    )

    const paymentStatus = payment?.status ?? null
    if (!paymentStatus) {
      return {
        orderId: candidate.id,
        paymentId,
        paymentStatus: null,
        previousOrderStatus,
        orderStatus: previousOrderStatus,
        updated: false,
        error: 'Не удалось получить статус платежа в ЮKassa',
      }
    }

    if (paymentStatus === 'succeeded' && previousOrderStatus !== 'paid') {
      const result = await transitionOrderToPaid(candidate.id, source)
      return {
        orderId: candidate.id,
        paymentId,
        paymentStatus,
        previousOrderStatus,
        orderStatus: result.status,
        updated: result.changed,
      }
    }
    if (paymentStatus === 'canceled' && previousOrderStatus === 'pending') {
      const result = await transitionOrderToCanceled(candidate.id, source)
      return {
        orderId: candidate.id,
        paymentId,
        paymentStatus,
        previousOrderStatus,
        orderStatus: result.status,
        updated: result.changed,
      }
    }

    return {
      orderId: candidate.id,
      paymentId,
      paymentStatus,
      previousOrderStatus,
      orderStatus: previousOrderStatus,
      updated: false,
    }
  } catch (err) {
    return {
      orderId: candidate.id,
      paymentId,
      paymentStatus: null,
      previousOrderStatus,
      orderStatus: previousOrderStatus,
      updated: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export interface SyncPendingOrdersOptions {
  /** Глубина просмотра «вглубь истории» (заказы старше — не берём). */
  since: Date
  /** Максимум заказов за один прогон. */
  take: number
  /** Если задан — фильтр по бренду. */
  brandId?: BrandId | null
  /** Источник: webhook не используется здесь, но различает 'admin-sync' / 'cron-poll'. */
  source: OrderPaymentTransitionSource
  /**
   * Применять ли throttle по возрасту заказа. true — для крона
   * (чтобы не дёргать ЮKassa слишком часто), false — для ручной кнопки.
   */
  honorThrottle: boolean
  /** Кастомные тиры throttle (в основном для тестов). */
  tiers?: ReadonlyArray<PollThrottleTier>
}

export interface SyncPendingOrdersResult {
  scanned: number
  skippedByThrottle: number
  updated: number
  updatedToPaid: number
  updatedToCanceled: number
  errors: number
  items: SyncOnePendingOrderResult[]
}

/**
 * Опрашивает все pending-заказы в ЮKassa за указанный период.
 * Используется и из админской ручной кнопки, и из крон-поллера.
 */
export async function syncPendingOrdersBatch(
  options: SyncPendingOrdersOptions
): Promise<SyncPendingOrdersResult> {
  const candidates = await orderService.getPendingOrdersWithYookassaPayment({
    since: options.since,
    take: options.take,
    brandId: options.brandId ?? null,
  })

  const credentialsByBrand = new Map<BrandId, { shopId: string; secretKey: string } | undefined>()

  async function getCredentialsForBrand(brand: BrandId) {
    const cached = credentialsByBrand.get(brand)
    if (cached !== undefined) return cached
    const yookassaSettings = await settingsService.getYookassaSettingsMap({ brandId: brand })
    const shopIdFromAdmin = (yookassaSettings.yookassa_shop_id ?? '').trim()
    const secretKeyFromAdmin = (yookassaSettings.yookassa_secret_key ?? '').trim()
    const hasFromAdmin = shopIdFromAdmin.length > 0 && secretKeyFromAdmin.length > 0
    const credentials = hasFromAdmin ? { shopId: shopIdFromAdmin, secretKey: secretKeyFromAdmin } : undefined
    credentialsByBrand.set(brand, credentials)
    return credentials
  }

  const items: SyncOnePendingOrderResult[] = []
  const now = new Date()
  let updated = 0
  let updatedToPaid = 0
  let updatedToCanceled = 0
  let errors = 0
  let skippedByThrottle = 0

  for (const candidate of candidates) {
    if (
      options.honorThrottle &&
      !shouldPollOrder({
        createdAt: candidate.createdAt,
        yookassaCheckedAt: candidate.yookassaCheckedAt,
        now,
        tiers: options.tiers,
      })
    ) {
      skippedByThrottle++
      continue
    }

    const result = await syncOnePendingOrder(candidate, options.source, getCredentialsForBrand)
    items.push(result)

    if (result.error) errors++
    if (result.updated) {
      updated++
      if (result.orderStatus === 'paid') updatedToPaid++
      else if (result.orderStatus === 'canceled') updatedToCanceled++
    }
  }

  return {
    scanned: candidates.length,
    skippedByThrottle,
    updated,
    updatedToPaid,
    updatedToCanceled,
    errors,
    items,
  }
}
