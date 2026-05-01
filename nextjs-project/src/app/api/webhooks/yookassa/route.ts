import { after, NextResponse } from 'next/server'
import { createCdekOrder } from '@/lib/cdek'
import { getYookassaPayment } from '@/lib/yookassa'
import { notifyTelegramPaymentError } from '@/lib/telegram-notify'
import { notifyMaxPaymentError } from '@/lib/max-notify'
import {
  notifyTelegramOrderStatusForUser,
  notifyTelegramCdekTrackForUser,
} from '@/lib/telegram-notify'
import {
  notifyMaxOrderStatusForUser,
  notifyMaxCdekTrackForUser,
} from '@/lib/max-notify'
import { scheduleNotifyAllChannelsAfterOrderPaid } from '@/lib/order-paid-notifications'
import { sendCdekTrackEmailsForOrder } from '@/lib/cdek-track-email'
import * as orderService from '@/services/order.service'
import * as settingsService from '@/services/settings.service'

/**
 * Webhook ЮKassa: обновление статуса заказа по уведомлениям.
 *
 * URL для уведомлений (указать в ЛК ЮKassa: Интеграция → HTTP-уведомления):
 *   https://<ваш-домен>/api/webhooks/yookassa
 *
 * События: payment.succeeded (заказ → paid), payment.canceled (заказ → canceled).
 * Перед установкой «оплачен» статус платежа верифицируется через GET /payments/{id}.
 * Документация: https://yookassa.ru/developers/using-api/webhooks
 */

interface YookassaNotificationPayload {
  type: 'notification'
  event: string
  object: {
    id: string
    status: string
    metadata?: { orderId?: string }
  }
}

/** Допустимые IP ЮKassa для проверки (опционально). */
const YOOKASSA_IP_PREFIXES = [
  '77.75.154.',
  '77.75.156.',
  '77.75.153.',
  '185.71.76.',
  '185.71.77.',
]

function isLikelyYookassaRequest(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : null
  if (!ip) return true
  return YOOKASSA_IP_PREFIXES.some((prefix) => ip.startsWith(prefix))
}

/** In production, require HTTPS (e.g. behind reverse proxy). */
function isSecureRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const proto = request.headers.get('x-forwarded-proto')
  return proto === 'https'
}

export async function POST(request: Request) {
  if (!isSecureRequest(request)) {
    return NextResponse.json({ error: 'HTTPS required' }, { status: 403 })
  }
  if (!isLikelyYookassaRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: YookassaNotificationPayload
  try {
    body = (await request.json()) as YookassaNotificationPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.type !== 'notification' || !body.event || !body.object) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const orderId = body.object.metadata?.orderId
  if (!orderId) {
    return NextResponse.json({ ok: true })
  }

  const order = await orderService.findOrderForWebhook(orderId)
  if (!order || order.yookassaPaymentId !== body.object.id) {
    return NextResponse.json({ ok: true })
  }

  const orderBrandId = await orderService.findOrderBrandIdForNotify(orderId)

  if (body.event === 'payment.succeeded' && order.status !== 'paid') {
    let payment: { status: string } | null = null
    try {
      const yookassaSettings = await settingsService.getYookassaSettingsMap({ brandId: orderBrandId })
      const shopIdFromAdmin = (yookassaSettings.yookassa_shop_id ?? '').trim()
      const secretKeyFromAdmin = (yookassaSettings.yookassa_secret_key ?? '').trim()
      const hasFromAdmin = shopIdFromAdmin.length > 0 && secretKeyFromAdmin.length > 0
      const credentials = hasFromAdmin
        ? { shopId: shopIdFromAdmin, secretKey: secretKeyFromAdmin }
        : undefined
      payment = await getYookassaPayment(body.object.id, credentials)
    } catch (err) {
      console.error('[webhook/yookassa] GET payment verification failed', orderId, err)
      const errorMessage = err instanceof Error ? err.message : String(err)
      const paymentErrorPayload = {
        orderId,
        errorMessage,
        context: 'webhook',
        brandId: orderBrandId,
      } as const
      notifyTelegramPaymentError(paymentErrorPayload)
      after(() => notifyMaxPaymentError(paymentErrorPayload))
      return NextResponse.json({ ok: true })
    }
    if (!payment || payment.status !== 'succeeded') {
      return NextResponse.json({ ok: true })
    }

    await orderService.updateOrderStatus(orderId, 'paid')
    if (order.userId) {
      void notifyTelegramOrderStatusForUser({
        userId: order.userId,
        orderId,
        orderNumber: order.orderNumber ?? null,
        status: 'paid',
        brandId: orderBrandId,
      })
      after(() =>
        notifyMaxOrderStatusForUser({
          userId: order.userId!,
          orderId,
          orderNumber: order.orderNumber ?? null,
          status: 'paid',
          brandId: orderBrandId,
        })
      )
    }

    const orderWithShipping = await orderService.findOrderWithShipping(orderId)
    const previousTrackNumber = orderWithShipping?.cdekTrackNumber ?? null
    const isCdek =
      orderWithShipping?.shippingInfo?.deliveryMethod === 'cdek_pvz' ||
      orderWithShipping?.shippingInfo?.deliveryMethod === 'cdek_door'
    if (isCdek && !orderWithShipping?.cdekOrderUuid) {
      const maxAttempts = 3
      const delayMs = 2500
      let lastError = ''
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = await createCdekOrder(orderId)
        if ('uuid' in result) {
          await orderService.updateOrder(orderId, {
            cdekOrderUuid: result.uuid,
            cdekTrackNumber: result.trackNumber ?? null,
            cdekOrderError: null,
          })
          break
        }
        lastError = result.error
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs))
        }
      }
      if (lastError) {
        await orderService.updateOrder(orderId, { cdekOrderError: lastError })
        console.error('[webhook/yookassa] CDEK order create failed after retries', orderId, lastError)
      }

      // If we received track number during CDEK creation, notify once.
      const updatedOrder = await orderService.findOrderWithShipping(orderId)
      const newTrackNumber = updatedOrder?.cdekTrackNumber ?? null
      if (!previousTrackNumber && newTrackNumber) {
        after(() => sendCdekTrackEmailsForOrder(orderId, newTrackNumber))
      }
      if (order.userId) {
        if (!previousTrackNumber && newTrackNumber) {
          void notifyTelegramCdekTrackForUser({
            userId: order.userId,
            orderId,
            orderNumber: order.orderNumber ?? null,
            trackNumber: newTrackNumber,
            brandId: orderBrandId,
          })
          after(() =>
            notifyMaxCdekTrackForUser({
              userId: order.userId!,
              orderId,
              orderNumber: order.orderNumber ?? null,
              trackNumber: newTrackNumber,
              brandId: orderBrandId,
            })
          )
        }
      }

    }

    scheduleNotifyAllChannelsAfterOrderPaid(orderId)
  } else if (body.event === 'payment.canceled' && order.status === 'pending') {
    await orderService.updateOrderStatus(orderId, 'canceled')
    if (order.userId) {
      void notifyTelegramOrderStatusForUser({
        userId: order.userId,
        orderId,
        orderNumber: order.orderNumber ?? null,
        status: 'canceled',
        brandId: orderBrandId,
      })
      after(() =>
        notifyMaxOrderStatusForUser({
          userId: order.userId!,
          orderId,
          orderNumber: order.orderNumber ?? null,
          status: 'canceled',
          brandId: orderBrandId,
        })
      )
    }
  }

  return NextResponse.json({ ok: true })
}
