import { NextResponse } from 'next/server'
import * as productService from '@/services/product.service'

/** Сток обновляется по кешу раз в 2 минуты. Используйте для корзины и блоков «в наличии». */
export const dynamic = 'force-dynamic'
export const revalidate = 120

export async function GET() {
  const stock = await productService.getStockMap()
  return NextResponse.json(stock, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
