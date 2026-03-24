import { NextRequest, NextResponse } from 'next/server'
import * as productService from '@/services/product.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

/** Returns minimal product data for cart display (enrichment after localStorage rehydration). Public. */
export async function GET(request: NextRequest) {
  const brandId = resolveBrandOrDefaultFromRequest(request)
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids')
  const ids = idsParam ? idsParam.split(',').filter(Boolean) : []
  if (ids.length === 0) {
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  const products = await productService.getProductsForCart(ids, brandId)
  return NextResponse.json(products, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
