import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import * as orderService from '@/services/order.service'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { id: orderId } = await context.params
  const order = await orderService.getOrderDetailForAdmin(orderId)

  if (!order) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  }

  return NextResponse.json(order)
}
