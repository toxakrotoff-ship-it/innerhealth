import { NextResponse } from 'next/server'
import { calculateGiftsForOrder } from '@/services/gift-promotion.service'
import * as productService from '@/services/product.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

interface GiftCalcItemInput {
  productId: string
  quantity: number
}

interface GiftCalcBody {
  items: GiftCalcItemInput[]
  hasPromoCode: boolean
}

function parseGiftCalcBody(value: unknown): GiftCalcBody {
  if (typeof value !== 'object' || value == null) throw new Error('Invalid payload')

  const v = value as Record<string, unknown>
  const rawItems = Array.isArray(v.items) ? (v.items as unknown[]) : []
  const hasPromoCode = Boolean(v.hasPromoCode)

  const items: GiftCalcItemInput[] = rawItems
    .map((raw) => raw as Record<string, unknown>)
    .map((i) => ({
      productId: String(i.productId ?? '').trim(),
      quantity: Number(i.quantity ?? 0),
    }))
    .filter((i) => i.productId.length > 0)
    .map((i) => ({
      ...i,
      quantity: Number.isFinite(i.quantity) ? Math.max(0, Math.floor(i.quantity)) : 0,
    }))

  if (items.length > 200) throw new Error('Too many items')

  return { items, hasPromoCode }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, hasPromoCode } = parseGiftCalcBody(body)
    const brandId = resolveBrandOrDefaultFromRequest(req)

    const productIds = Array.from(new Set(items.map((i) => i.productId)))
    const products = productIds.length > 0 ? await productService.getProductsForCart(productIds, brandId) : []
    const productMap = new Map(products.map((p) => [p.id, p]))

    const itemsForCalculation = items
      .map((i) => {
        const p = productMap.get(i.productId)
        if (!p) return null
        const hasPromoPrice = p.priceOld != null && p.priceOld > p.price
        return {
          productId: i.productId,
          quantity: i.quantity,
          price: p.price,
          hasPromoPrice,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null && x.quantity > 0)

    const gifts = await calculateGiftsForOrder({
      items: itemsForCalculation,
      hasPromoCode,
      brandId,
    })

    return NextResponse.json({ gifts }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

