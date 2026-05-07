import { after, NextResponse } from 'next/server'
import { getYookassaPayment } from '@/lib/yookassa'
import { notifyTelegramPaymentError } from '@/lib/telegram-notify'
import { notifyMaxPaymentError } from '@/lib/max-notify'
import {
  extractClientIpFromForwarded,
  isYookassaIp,
  isYookassaIpFilterEnabled,
} from '@/lib/yookassa-ip-allowlist'
import {
  transitionOrderToCanceled,
  transitionOrderToPaid,
} from '@/lib/order-payment-flow'
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
 *
 * Транзиентные ошибки верификации возвращают 502, чтобы ЮKassa повторила
 * уведомление (ретраи до ~24 часов). 200 отдаётся только если статус
 * безусловно подтверждён или его обновление не требуется.
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

function isSecureRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const proto = request.headers.get('x-forwarded-proto')
  return proto === 'https'
}

function isLikelyYookassaRequest(request: Request): boolean {
  if (!isYookassaIpFilterEnabled()) return true
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = extractClientIpFromForwarded(forwarded) ?? (realIp ? realIp.trim() : null)
  if (!ip) return true
  return isYookassaIp(ip)
}

export async function POST(request: Request) {
  if (!isSecureRequest(request)) {
    return NextResponse.json({ error: 'HTTPS required' }, { status: 403 })
  }
  if (!isLikelyYookassaRequest(request)) {
    const ip =
      extractClientIpFromForwarded(request.headers.get('x-forwarded-for')) ??
      request.headers.get('x-real-ip') ??
      'unknown'
    console.warn('[webhook/yookassa] rejected by IP allowlist', ip)
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

  if (body.event === 'payment.succeeded') {
    if (order.status === 'paid') {
      return NextResponse.json({ ok: true })
    }

    const orderBrandId = await orderService.findOrderBrandIdForNotify(orderId)
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
      return NextResponse.json(
        { error: 'YooKassa verification temporarily failed; retry expected' },
        { status: 502 }
      )
    }

    if (!payment) {
      console.warn(
        '[webhook/yookassa] GET payment returned null (likely auth/network); request retry',
        orderId
      )
      return NextResponse.json(
        { error: 'YooKassa verification returned no payment; retry expected' },
        { status: 502 }
      )
    }

    if (payment.status !== 'succeeded') {
      // Платёж ещё не успешен: 200, но статус заказа не трогаем — ЮKassa пришлёт
      // следующий callback при `succeeded`.
      return NextResponse.json({ ok: true, paymentStatus: payment.status })
    }

    await transitionOrderToPaid(orderId, 'webhook')
    return NextResponse.json({ ok: true })
  }

  if (body.event === 'payment.canceled') {
    await transitionOrderToCanceled(orderId, 'webhook')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
