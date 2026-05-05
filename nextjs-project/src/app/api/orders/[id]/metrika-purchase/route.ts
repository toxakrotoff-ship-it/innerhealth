import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { id: orderId } = await context.params
  const url = new URL(request.url)
  const paymentId = url.searchParams.get('paymentId')?.trim() ?? ''
  if (!paymentId) return NextResponse.json({ error: 'paymentId is required' }, { status: 400 })

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      total: true,
      yookassaPaymentId: true,
      brand: true,
      items: {
        where: { isGift: false },
        select: {
          quantity: true,
          price: true,
          productId: true,
          product: { select: { title: true } },
        },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.brand !== 'inner') return NextResponse.json({ ok: true, eligible: false })
  if (order.yookassaPaymentId !== paymentId) return NextResponse.json({ ok: true, eligible: false })

  return NextResponse.json({
    ok: true,
    eligible: order.status === 'paid',
    order: {
      id: order.id,
      status: order.status,
      value: order.total,
      currency: 'RUB',
      items: order.items.map((i) => ({
        item_id: i.productId,
        item_name: i.product.title,
        price: i.price,
        quantity: i.quantity,
      })),
    },
  })
}

