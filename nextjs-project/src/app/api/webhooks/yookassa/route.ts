import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Webhook ЮKassa: при успешной оплате переводим заказ в статус PAID.
 * URL настраивается в личном кабинете ЮKassa: Интеграция → HTTP-уведомления.
 * События: payment.succeeded (и при необходимости payment.canceled).
 *
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

  if (body.event === 'payment.succeeded') {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, yookassaPaymentId: true },
    })
    if (order && order.yookassaPaymentId === body.object.id && order.status !== 'paid') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
