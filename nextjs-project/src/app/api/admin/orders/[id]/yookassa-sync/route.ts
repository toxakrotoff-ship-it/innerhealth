import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { syncOnePendingOrder } from '@/lib/yookassa-sync-service'
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

  const result = await syncOnePendingOrder(
    {
      id: orderId,
      status: order.status,
      // createdAt/yookassaCheckedAt не используются single-sync (без throttle).
      createdAt: new Date(),
      yookassaPaymentId: paymentId,
      yookassaCheckedAt: null,
      brand: orderBrandId,
    },
    'admin-sync',
    async (brandId) => {
      const yookassaSettings = await settingsService.getYookassaSettingsMap({ brandId })
      const shopId = (yookassaSettings.yookassa_shop_id ?? '').trim()
      const secretKey = (yookassaSettings.yookassa_secret_key ?? '').trim()
      if (!shopId || !secretKey) return undefined
      return { shopId, secretKey }
    }
  )

  if (result.error) {
    return NextResponse.json<YookassaSyncResponse>(
      {
        ok: false,
        orderId,
        paymentId,
        previousOrderStatus: result.previousOrderStatus,
        orderStatus: result.orderStatus,
        paymentStatus: result.paymentStatus ?? undefined,
        updated: result.updated,
        error: result.error,
      },
      { status: 502 }
    )
  }

  return NextResponse.json<YookassaSyncResponse>({
    ok: true,
    orderId,
    paymentId,
    paymentStatus: result.paymentStatus ?? undefined,
    previousOrderStatus: result.previousOrderStatus,
    orderStatus: result.orderStatus,
    updated: result.updated,
  })
}
