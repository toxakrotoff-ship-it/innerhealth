import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { getYookassaPayment } from '@/lib/yookassa'
import * as orderService from '@/services/order.service'
import * as settingsService from '@/services/settings.service'

interface YookassaSyncResponse {
  ok: boolean
  orderId: string
  previousOrderStatus?: string
  orderStatus?: string
  paymentId?: string
  paymentStatus?: string
  updated?: boolean
  error?: string
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { id: orderId } = await context.params
  const order = await orderService.findOrderForWebhook(orderId)
  if (!order) {
    return NextResponse.json<YookassaSyncResponse>(
      { ok: false, orderId, error: 'Заказ не найден' },
      { status: 404 }
    )
  }

  const paymentId = order.yookassaPaymentId
  if (!paymentId) {
    return NextResponse.json<YookassaSyncResponse>(
      { ok: false, orderId, error: 'У заказа нет yookassaPaymentId' },
      { status: 400 }
    )
  }

  const orderBrandId = await orderService.findOrderBrandIdForNotify(orderId)
  const yookassaSettings = await settingsService.getYookassaSettingsMap({ brandId: orderBrandId })
  const shopIdFromAdmin = (yookassaSettings.yookassa_shop_id ?? '').trim()
  const secretKeyFromAdmin = (yookassaSettings.yookassa_secret_key ?? '').trim()
  const hasFromAdmin = shopIdFromAdmin.length > 0 && secretKeyFromAdmin.length > 0
  const credentials = hasFromAdmin ? { shopId: shopIdFromAdmin, secretKey: secretKeyFromAdmin } : undefined

  const payment = await getYookassaPayment(paymentId, credentials)
  if (!payment) {
    return NextResponse.json<YookassaSyncResponse>(
      { ok: false, orderId, paymentId, error: 'Не удалось получить статус платежа в ЮKassa' },
      { status: 502 }
    )
  }

  const previousOrderStatus = order.status
  const paymentStatus = payment.status

  let updated = false
  let orderStatus = previousOrderStatus

  if (paymentStatus === 'succeeded' && previousOrderStatus !== 'paid') {
    await orderService.updateOrderStatus(orderId, 'paid')
    updated = true
    orderStatus = 'paid'
  } else if (paymentStatus === 'canceled' && previousOrderStatus === 'pending') {
    await orderService.updateOrderStatus(orderId, 'canceled')
    updated = true
    orderStatus = 'canceled'
  }

  return NextResponse.json<YookassaSyncResponse>({
    ok: true,
    orderId,
    paymentId,
    paymentStatus,
    previousOrderStatus,
    orderStatus,
    updated,
  })
}

