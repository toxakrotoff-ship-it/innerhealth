import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/require-admin'
import { runOzonShipmentAction } from '@/lib/ozon-delivery/shipment'
import { ozonErrorResponse } from '@/lib/ozon-delivery/http'
import { getOzonDeliveryClient } from '@/lib/ozon-delivery/client'
import { normalizeBrandId } from '@/lib/brand/brand'
import { OzonCheckoutError } from '@/lib/ozon-delivery/parcel'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, context: Context) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id: orderId } = await context.params
  const shipment = await prisma.ozonShipment.findUnique({ where: { orderId }, select: { postingNumber: true, orderNumber: true, status: true, error: true, updatedAt: true } })
  return NextResponse.json({ shipment }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, context: Context) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  let raw: unknown
  try { raw = await request.json() } catch { return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 }) }
  const parsed = z.object({ action: z.enum(['create', 'sync', 'approve', 'label']) }).safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Укажите действие create, sync, approve или label' }, { status: 400 })
  try {
    const { id: orderId } = await context.params
    if (parsed.data.action === 'label') {
      const shipment = await prisma.ozonShipment.findUnique({ where: { orderId }, include: { order: { select: { brand: true, status: true, deletedAt: true } } } })
      if (!shipment?.postingNumber || shipment.order.deletedAt) throw new OzonCheckoutError('Отправление не найдено', 404)
      if (shipment.order.status !== 'paid') throw new OzonCheckoutError('Этикетка доступна только для оплаченных заказов')
      const brand = normalizeBrandId(shipment.order.brand)
      const client = brand ? await getOzonDeliveryClient(brand, { includeDisabled: true }) : null
      if (!client) throw new OzonCheckoutError('Доставка Ozon пока не подключена', 503)
      const pdf = await client.postingLabel(shipment.postingNumber)
      return new NextResponse(Buffer.from(pdf), { headers: {
        'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="ozon-label.pdf"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } })
    }
    const shipment = await runOzonShipmentAction(orderId, parsed.data.action)
    return NextResponse.json({ shipment: { postingNumber: shipment.postingNumber, orderNumber: shipment.orderNumber, status: shipment.status, error: shipment.error } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonErrorResponse(error) }
}
