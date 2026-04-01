import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'

export interface GiftPromotionForCalculation {
  id: string
  title: string
  status: string
  validFrom: Date | null
  validTo: Date | null
  giftProductId: string
  triggerType: string
  triggerProductId: string | null
  triggerProductMinQty: number | null
  minCartTotal: number | null
  giftQuantityMode: string
  maxGiftsPerOrder: number | null
  promoProductInteractionMode: string | null
  promoCodeInteractionMode: string | null
}

export interface OrderItemForGiftCalculation {
  productId: string
  quantity: number
  price: number
  hasPromoPrice: boolean
}

export interface CalculatedGiftLine {
  giftProductId: string
  quantity: number
  giftPromotionId: string
}

function isPromotionActive(promo: GiftPromotionForCalculation, now: Date): boolean {
  if (promo.status !== 'enabled') return false
  if (promo.validFrom && now < promo.validFrom) return false
  if (promo.validTo && now > promo.validTo) return false
  return true
}

export async function getActiveGiftPromotions(
  now: Date,
  brandId: BrandId | null = null
): Promise<GiftPromotionForCalculation[]> {
  const raw = await prisma.giftPromotion.findMany({
    where: { brand: resolveDbBrand(brandId) },
  })
  return raw
    .map<GiftPromotionForCalculation>((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      validFrom: p.validFrom ?? null,
      validTo: p.validTo ?? null,
      giftProductId: p.giftProductId,
      triggerType: p.triggerType,
      triggerProductId: p.triggerProductId ?? null,
      triggerProductMinQty: p.triggerProductMinQty ?? null,
      minCartTotal: p.minCartTotal ?? null,
      giftQuantityMode: p.giftQuantityMode,
      maxGiftsPerOrder: p.maxGiftsPerOrder ?? null,
      promoProductInteractionMode: p.promoProductInteractionMode ?? null,
      promoCodeInteractionMode: p.promoCodeInteractionMode ?? null,
    }))
    .filter((p) => isPromotionActive(p, now))
}

export async function calculateGiftsForOrder(params: {
  items: OrderItemForGiftCalculation[]
  hasPromoCode: boolean
  brandId?: BrandId | null
}): Promise<CalculatedGiftLine[]> {
  const now = new Date()
  const promotions = await getActiveGiftPromotions(now, params.brandId ?? null)
  if (promotions.length === 0) return []

  const hasPromoProducts = params.items.some((i) => i.hasPromoPrice)
  const baseTotal = params.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const result: CalculatedGiftLine[] = []

  for (const promo of promotions) {
    if (promo.promoProductInteractionMode === 'BLOCK_IF_PROMO_PRODUCTS_PRESENT' && hasPromoProducts) {
      continue
    }
    if (promo.promoCodeInteractionMode === 'BLOCK_IF_PROMOCODE_PRESENT' && params.hasPromoCode) {
      continue
    }

    let triggers = 0

    if (promo.triggerType === 'PRODUCT') {
      if (!promo.triggerProductId || !promo.triggerProductMinQty || promo.triggerProductMinQty <= 0) {
        continue
      }
      const totalQty = params.items
        .filter((i) => i.productId === promo.triggerProductId)
        .reduce((sum, i) => sum + i.quantity, 0)
      if (totalQty < promo.triggerProductMinQty) {
        continue
      }
      if (promo.giftQuantityMode === 'PER_TRIGGER') {
        triggers = Math.floor(totalQty / promo.triggerProductMinQty)
      } else {
        triggers = 1
      }
    } else if (promo.triggerType === 'CART_TOTAL') {
      if (promo.minCartTotal == null || promo.minCartTotal <= 0) {
        continue
      }
      if (baseTotal < promo.minCartTotal) {
        continue
      }
      triggers = 1
    } else {
      continue
    }

    if (triggers <= 0) {
      continue
    }

    let giftQty = promo.giftQuantityMode === 'PER_TRIGGER' ? triggers : 1
    if (promo.maxGiftsPerOrder != null && promo.maxGiftsPerOrder >= 0) {
      giftQty = Math.min(giftQty, promo.maxGiftsPerOrder)
    }
    if (giftQty <= 0) {
      continue
    }

    result.push({
      giftProductId: promo.giftProductId,
      quantity: giftQty,
      giftPromotionId: promo.id,
    })
  }

  return result
}

export async function getPublicGiftPromotions(
  now: Date,
  brandId: BrandId | null = null
) {
  const promos = await prisma.giftPromotion.findMany({
    where: {
      brand: resolveDbBrand(brandId),
      status: 'enabled',
      showOnSite: true,
      OR: [
        { validFrom: null },
        { validFrom: { lte: now } },
      ],
      AND: [
        { OR: [{ validTo: null }, { validTo: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      giftProduct: {
        select: {
          id: true,
          title: true,
          photo: true,
          slug: true,
        },
      },
    },
  })

  return promos
}

export async function getGiftPromotionsForAdmin(brandId: BrandId | null = null) {
  return prisma.giftPromotion.findMany({
    where: { brand: resolveDbBrand(brandId) },
    orderBy: { createdAt: 'desc' },
    include: {
      giftProduct: {
        select: { id: true, title: true },
      },
    },
  })
}

export async function createGiftPromotionForAdmin(
  data: Prisma.GiftPromotionUncheckedCreateInput,
  brandId: BrandId | null = null
) {
  return prisma.giftPromotion.create({
    data: {
      ...data,
      brand: resolveDbBrand(brandId),
    },
  })
}

export async function findGiftPromotionByIdForAdmin(
  id: string,
  brandId: BrandId | null = null
) {
  return prisma.giftPromotion.findFirst({
    where: { id, brand: resolveDbBrand(brandId) },
  })
}

export async function updateGiftPromotionForAdmin(
  id: string,
  data: Prisma.GiftPromotionUncheckedUpdateInput,
  brandId: BrandId | null = null
) {
  const existing = await findGiftPromotionByIdForAdmin(id, brandId)
  if (!existing) return null
  return prisma.giftPromotion.update({
    where: { id },
    data,
  })
}

export async function deleteGiftPromotionForAdmin(
  id: string,
  brandId: BrandId | null = null
) {
  const existing = await findGiftPromotionByIdForAdmin(id, brandId)
  if (!existing) return null
  return prisma.giftPromotion.delete({ where: { id } })
}
