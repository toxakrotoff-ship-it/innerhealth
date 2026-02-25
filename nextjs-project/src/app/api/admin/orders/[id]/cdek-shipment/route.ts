import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { createCdekOrder } from '@/lib/cdek'
import * as orderService from '@/services/order.service'

/**
 * POST /api/admin/orders/[id]/cdek-shipment
 * Создаёт заказ на отгрузку в СДЭК для оплаченного заказа с доставкой СДЭК.
 * Используется для повтора при ошибке автоматического создания после оплаты.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { id: orderId } = await context.params
  const order = await orderService.findOrderForCdekShipment(orderId)

  if (!order) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  }
  if (order.status !== 'paid') {
    return NextResponse.json(
      { error: 'Создание отгрузки СДЭК доступно только для оплаченных заказов' },
      { status: 400 }
    )
  }
  const isCdek =
    order.shippingInfo?.deliveryMethod === 'cdek_pvz' ||
    order.shippingInfo?.deliveryMethod === 'cdek_door'
  if (!isCdek) {
    return NextResponse.json(
      { error: 'У заказа не выбрана доставка СДЭК' },
      { status: 400 }
    )
  }
  if (order.cdekOrderUuid) {
    return NextResponse.json(
      { success: true, uuid: order.cdekOrderUuid, message: 'Заказ СДЭК уже создан' },
      { status: 200 }
    )
  }

  const result = await createCdekOrder(orderId)
  if ('uuid' in result) {
    await orderService.updateOrder(orderId, {
      cdekOrderUuid: result.uuid,
      cdekOrderError: null,
    })
    return NextResponse.json({ success: true, uuid: result.uuid })
  }

  await orderService.updateOrder(orderId, { cdekOrderError: result.error })
  return NextResponse.json(
    { success: false, error: result.error },
    { status: 502 }
  )
}
