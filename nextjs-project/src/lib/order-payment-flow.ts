import 'server-only'
import { after } from 'next/server'
import type { BrandId } from '@/lib/brand/brand'
import { createCdekOrder } from '@/lib/cdek'
import { sendCdekTrackEmailsForOrder } from '@/lib/cdek-track-email'
import {
  notifyTelegramOrderStatusForUser,
  notifyTelegramCdekTrackForUser,
} from '@/lib/telegram-notify'
import {
  notifyMaxOrderStatusForUser,
  notifyMaxCdekTrackForUser,
} from '@/lib/max-notify'
import { scheduleNotifyAllChannelsAfterOrderPaid } from '@/lib/order-paid-notifications'
import * as orderService from '@/services/order.service'

/**
 * Источник перевода заказа в оплачен/отменён. Используется для логирования
 * и для решения, выполнять ли тяжёлые сайд-эффекты (CDEK, уведомления).
 */
export type OrderPaymentTransitionSource = 'webhook' | 'admin-sync' | 'cron-poll'

/** Результат перехода в оплачен/отменён. */
export interface OrderTransitionResult {
  /** Был ли произведён реальный переход статуса (false = заказ уже в целевом статусе). */
  changed: boolean
  /** Предыдущий статус заказа. */
  previousStatus: string
  /** Текущий статус заказа после перехода. */
  status: string
}

/**
 * Переводит заказ в статус «оплачен» и запускает все полагающиеся сайд-эффекты:
 * — клиенту: уведомления в Telegram и MAX о смене статуса;
 * — заказу: создание отгрузки СДЭК (если доставка СДЭК и UUID ещё не выписан), с ретраями;
 * — клиенту: письмо и уведомления о трек-номере, если он появился по факту создания СДЭК;
 * — админам/клиенту/партнёру: пакет уведомлений «оплачено» (`scheduleNotifyAllChannelsAfterOrderPaid`).
 *
 * Идемпотентно: если заказ уже `paid`, возвращает `{ changed: false }` и не дублирует сайд-эффекты.
 *
 * Используется в webhook ЮKassa, ручной кнопке синхронизации в админке и
 * в крон-поллере — чтобы все три канала обновления статуса вели себя одинаково.
 */
export async function transitionOrderToPaid(
  orderId: string,
  source: OrderPaymentTransitionSource
): Promise<OrderTransitionResult> {
  const order = await orderService.findOrderForWebhook(orderId)
  if (!order) {
    return { changed: false, previousStatus: 'unknown', status: 'unknown' }
  }
  if (order.status === 'paid') {
    return { changed: false, previousStatus: 'paid', status: 'paid' }
  }

  const previousStatus = order.status
  const orderBrandId = await orderService.findOrderBrandIdForNotify(orderId)

  await orderService.updateOrderStatus(orderId, 'paid')

  if (order.userId) {
    notifyUserOrderStatusInBackground({
      userId: order.userId,
      orderId,
      orderNumber: order.orderNumber ?? null,
      status: 'paid',
      brandId: orderBrandId,
    })
  }

  await runCdekShipmentSideEffects({
    orderId,
    orderBrandId,
    customerUserId: order.userId ?? null,
    customerOrderNumber: order.orderNumber ?? null,
    source,
  })

  scheduleNotifyAllChannelsAfterOrderPaid(orderId)

  return { changed: true, previousStatus, status: 'paid' }
}

/**
 * Переводит заказ в статус «отменён». Сайд-эффекты — только клиентские
 * уведомления о смене статуса (Telegram, MAX).
 *
 * Идемпотентно: переводит только заказы в статусе `pending`.
 */
export async function transitionOrderToCanceled(
  orderId: string,
  _source: OrderPaymentTransitionSource
): Promise<OrderTransitionResult> {
  const order = await orderService.findOrderForWebhook(orderId)
  if (!order) {
    return { changed: false, previousStatus: 'unknown', status: 'unknown' }
  }
  if (order.status !== 'pending') {
    return { changed: false, previousStatus: order.status, status: order.status }
  }

  const orderBrandId = await orderService.findOrderBrandIdForNotify(orderId)
  await orderService.updateOrderStatus(orderId, 'canceled')

  if (order.userId) {
    notifyUserOrderStatusInBackground({
      userId: order.userId,
      orderId,
      orderNumber: order.orderNumber ?? null,
      status: 'canceled',
      brandId: orderBrandId,
    })
  }

  return { changed: true, previousStatus: 'pending', status: 'canceled' }
}

interface UserOrderStatusNotifyArgs {
  userId: string
  orderId: string
  orderNumber: number | null
  status: 'paid' | 'canceled'
  brandId: BrandId
}

function notifyUserOrderStatusInBackground(args: UserOrderStatusNotifyArgs): void {
  void notifyTelegramOrderStatusForUser(args).catch((e) =>
    console.error('[order-payment-flow] notifyTelegramOrderStatusForUser failed', args.orderId, e)
  )
  after(() =>
    notifyMaxOrderStatusForUser(args).catch((e) =>
      console.error('[order-payment-flow] notifyMaxOrderStatusForUser failed', args.orderId, e)
    )
  )
}

interface CdekSideEffectsArgs {
  orderId: string
  orderBrandId: BrandId
  customerUserId: string | null
  customerOrderNumber: number | null
  source: OrderPaymentTransitionSource
}

/**
 * Создание отгрузки СДЭК после оплаты + уведомление клиента о трек-номере.
 * Изолировано от потока оплаты, чтобы ошибки СДЭК не ломали транзакцию статуса.
 */
async function runCdekShipmentSideEffects(args: CdekSideEffectsArgs): Promise<void> {
  const orderWithShipping = await orderService.findOrderWithShipping(args.orderId)
  const previousTrackNumber = orderWithShipping?.cdekTrackNumber ?? null
  const isCdek =
    orderWithShipping?.shippingInfo?.deliveryMethod === 'cdek_pvz' ||
    orderWithShipping?.shippingInfo?.deliveryMethod === 'cdek_door'
  if (!isCdek || orderWithShipping?.cdekOrderUuid) return

  const maxAttempts = 3
  const delayMs = 2500
  let lastError = ''
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await createCdekOrder(args.orderId)
    if ('uuid' in result) {
      await orderService.updateOrder(args.orderId, {
        cdekOrderUuid: result.uuid,
        cdekTrackNumber: result.trackNumber ?? null,
        cdekOrderError: null,
      })
      lastError = ''
      break
    }
    lastError = result.error
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  if (lastError) {
    await orderService.updateOrder(args.orderId, { cdekOrderError: lastError })
    console.error(
      '[order-payment-flow] CDEK order create failed after retries',
      args.orderId,
      args.source,
      lastError
    )
    return
  }

  const updatedOrder = await orderService.findOrderWithShipping(args.orderId)
  const newTrackNumber = updatedOrder?.cdekTrackNumber ?? null
  if (!previousTrackNumber && newTrackNumber) {
    after(() => sendCdekTrackEmailsForOrder(args.orderId, newTrackNumber))
    if (args.customerUserId) {
      const cdekTrackPayload = {
        userId: args.customerUserId,
        orderId: args.orderId,
        orderNumber: args.customerOrderNumber,
        trackNumber: newTrackNumber,
        brandId: args.orderBrandId,
      }
      void notifyTelegramCdekTrackForUser(cdekTrackPayload).catch((e) =>
        console.error('[order-payment-flow] notifyTelegramCdekTrackForUser failed', args.orderId, e)
      )
      after(() =>
        notifyMaxCdekTrackForUser(cdekTrackPayload).catch((e) =>
          console.error('[order-payment-flow] notifyMaxCdekTrackForUser failed', args.orderId, e)
        )
      )
    }
  }
}
