import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCdekOrder } from '@/lib/cdek'

/**
 * POST /api/admin/orders/[id]/cdek-shipment
 * Создаёт заказ на отгрузку в СДЭК для оплаченного заказа с доставкой СДЭК.
 * Используется для повтора при ошибке автоматического создания после оплаты.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: orderId } = await context.params
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      cdekOrderUuid: true,
      shippingInfo: { select: { deliveryMethod: true } },
    },
  })

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
    await prisma.order.update({
      where: { id: orderId },
      data: { cdekOrderUuid: result.uuid, cdekOrderError: null },
    })
    return NextResponse.json({ success: true, uuid: result.uuid })
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { cdekOrderError: result.error },
  })
  return NextResponse.json(
    { success: false, error: result.error },
    { status: 502 }
  )
}
