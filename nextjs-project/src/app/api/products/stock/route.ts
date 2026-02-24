import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Сток обновляется по кешу раз в 2 минуты. Используйте для корзины и блоков «в наличии». */
export const dynamic = 'force-dynamic'
export const revalidate = 120

export async function GET() {
  const rows = await prisma.product.findMany({
    select: { id: true, quantity: true },
  })
  const stock: Record<string, number | null> = {}
  for (const row of rows) {
    stock[row.id] = row.quantity
  }
  return NextResponse.json(stock)
}
