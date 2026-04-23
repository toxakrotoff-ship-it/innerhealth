import { NextResponse } from 'next/server'
import { calculateGiftsForOrder } from '@/services/gift-promotion.service'
import type { BrandId } from '@/lib/brand/brand'

interface GiftCalcItemInput {
  productId: string
  quantity: number
  price: number
  hasPromoPrice: boolean
}

interface GiftCalcBody {
  items: GiftCalcItemInput[]
  hasPromoCode: boolean
  brandId: BrandId | null
}

function parseGiftCalcBody(value: unknown): GiftCalcBody {
  if (typeof value !== 'object' || value == null) throw new Error('Invalid payload')

  const v = value as Record<string, unknown>
  const rawItems = Array.isArray(v.items) ? (v.items as unknown[]) : []
  const hasPromoCode = Boolean(v.hasPromoCode)
  const brandId = typeof v.brandId === 'string' ? (v.brandId as BrandId) : null

  const items: GiftCalcItemInput[] = rawItems
    .map((raw) => raw as Record<string, unknown>)
    .map((i) => ({
      productId: String(i.productId ?? '').trim(),
      quantity: Number(i.quantity ?? 0),
      price: Number(i.price ?? 0),
      hasPromoPrice: Boolean(i.hasPromoPrice),
    }))
    .filter((i) => i.productId.length > 0)
    .map((i) => ({
      ...i,
      quantity: Number.isFinite(i.quantity) ? Math.max(0, Math.floor(i.quantity)) : 0,
      price: Number.isFinite(i.price) ? Math.max(0, i.price) : 0,
    }))

  if (items.length > 200) throw new Error('Too many items')

  return { items, hasPromoCode, brandId }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { items, hasPromoCode, brandId } = parseGiftCalcBody(body)

    const gifts = await calculateGiftsForOrder({
      items,
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

