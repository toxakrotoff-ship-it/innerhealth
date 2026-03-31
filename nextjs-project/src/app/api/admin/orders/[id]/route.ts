import { NextResponse } from 'next/server'
import { syncCdekTrackNumberIfDue } from '@/lib/cdek'
import { requireAdminSession } from '@/lib/require-admin'
import * as orderService from '@/services/order.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  const { id: orderId } = await context.params
  await syncCdekTrackNumberIfDue(orderId)
  const order = await orderService.getOrderDetailForAdmin(orderId, brandId)

  if (!order) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
  }

  return NextResponse.json(order)
}
