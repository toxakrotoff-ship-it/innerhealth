import { NextResponse } from 'next/server'
import { createCdekOrder } from '@/lib/cdek'
import * as orderService from '@/services/order.service'

/**
 * Webhook ЮKassa: обновление статуса заказа по уведомлениям.
 *
 * URL для уведомлений (указать в ЛК ЮKassa: Интеграция → HTTP-уведомления):
 *   https://<ваш-домен>/api/webhooks/yookassa
 *
 * События: payment.succeeded (заказ → paid), payment.canceled (заказ → canceled).
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

export async function POST(request: Request) {
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

  if (body.event === 'payment.succeeded' && order.status !== 'paid') {
    await orderService.updateOrderStatus(orderId, 'paid')

    const orderWithShipping = await orderService.findOrderWithShipping(orderId)
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
    }
  } else if (body.event === 'payment.canceled' && order.status === 'pending') {
    await orderService.updateOrderStatus(orderId, 'canceled')
  }

  return NextResponse.json({ ok: true })
}
