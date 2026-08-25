import { after, NextResponse } from 'next/server'
import { getYookassaPayment, isYookassaDeclineReason, normalizeYookassaError, type YookassaCancellationDetails } from '@/lib/yookassa'
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
import * as checkoutSessionService from '@/services/checkout-session.service'
import {
  trackPaymentCallback,
  transitionCheckoutToPaymentCancelled,
  transitionCheckoutToPaymentFailed,
  transitionCheckoutToPaymentSucceeded,
} from '@/lib/checkout-session-flow'

/**
 * Checkout-tracking по orderId — best-effort, не должен ронять webhook. Заказы,
 * оформленные до раскатки фичи, не имеют CheckoutSession — это ожидаемо, не ошибка.
 */
async function trackCheckoutForOrderBestEffort(
  orderId: string,
  run: (sessionId: string) => Promise<void>
): Promise<void> {
  try {
    const session = await checkoutSessionService.findSessionByOrderId(orderId)
    if (!session) return
    await run(session.id)
  } catch (error) {
    console.error('[webhook/yookassa] checkout-session tracking failed:', orderId, error)
  }
}

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
    cancellation_details?: YookassaCancellationDetails
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
      const credentials = await settingsService.getYookassaCredentials({ brandId: orderBrandId })
      payment = await getYookassaPayment(body.object.id, credentials ?? null)
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
      await trackCheckoutForOrderBestEffort(orderId, (sessionId) =>
        trackPaymentCallback(sessionId, 'webhook', { status: payment!.status })
      )
      return NextResponse.json({ ok: true, paymentStatus: payment.status })
    }

    await transitionOrderToPaid(orderId, 'webhook')
    await trackCheckoutForOrderBestEffort(orderId, async (sessionId) => {
      await trackPaymentCallback(sessionId, 'webhook', { status: payment!.status })
      await transitionCheckoutToPaymentSucceeded(sessionId, 'webhook')
    })
    return NextResponse.json({ ok: true })
  }

  if (body.event === 'payment.canceled') {
    await transitionOrderToCanceled(orderId, 'webhook')
    await trackCheckoutForOrderBestEffort(orderId, async (sessionId) => {
      await trackPaymentCallback(sessionId, 'webhook', { status: 'canceled' })
      const reason = body.object.cancellation_details?.reason
      if (isYookassaDeclineReason(reason)) {
        await transitionCheckoutToPaymentFailed(
          sessionId,
          'webhook',
          normalizeYookassaError(body.object.cancellation_details)
        )
      } else {
        await transitionCheckoutToPaymentCancelled(sessionId, 'webhook')
      }
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
