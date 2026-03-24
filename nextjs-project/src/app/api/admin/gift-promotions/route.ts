import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/require-admin'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import * as productService from '@/services/product.service'
import * as giftPromotionService from '@/services/gift-promotion.service'

const createSchema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  status: z.enum(['enabled', 'disabled']).default('enabled'),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  giftProductId: z.string().min(1, 'Подарочный товар обязателен'),
  triggerType: z.enum(['PRODUCT', 'CART_TOTAL']),
  triggerProductId: z.string().optional().nullable(),
  triggerProductMinQty: z.number().int().min(1).nullable().optional(),
  minCartTotal: z.number().min(0).nullable().optional(),
  giftQuantityMode: z.enum(['ONE_PER_ORDER', 'PER_TRIGGER']),
  maxGiftsPerOrder: z.number().int().min(0).nullable().optional(),
  promoProductInteractionMode: z
    .enum(['BLOCK_IF_PROMO_PRODUCTS_PRESENT', 'ALWAYS_ALLOW'])
    .nullable()
    .optional(),
  promoCodeInteractionMode: z
    .enum(['ALLOW_WITH_PROMOCODE', 'BLOCK_IF_PROMOCODE_PRESENT'])
    .nullable()
    .optional(),
  autoRemoveWhenConditionFails: z.boolean().optional(),
  userCanRemoveGiftManually: z.boolean().optional(),
  showOnSite: z.boolean().optional(),
  siteTitle: z.string().nullable().optional(),
  siteDescription: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
})

const updateSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
  title: z.string().min(1).optional(),
  status: z.enum(['enabled', 'disabled']).optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  giftProductId: z.string().min(1).optional(),
  triggerType: z.enum(['PRODUCT', 'CART_TOTAL']).optional(),
  triggerProductId: z.string().nullable().optional(),
  triggerProductMinQty: z.number().int().min(1).nullable().optional(),
  minCartTotal: z.number().min(0).nullable().optional(),
  giftQuantityMode: z.enum(['ONE_PER_ORDER', 'PER_TRIGGER']).optional(),
  maxGiftsPerOrder: z.number().int().min(0).nullable().optional(),
  promoProductInteractionMode: z
    .enum(['BLOCK_IF_PROMO_PRODUCTS_PRESENT', 'ALWAYS_ALLOW'])
    .nullable()
    .optional(),
  promoCodeInteractionMode: z
    .enum(['ALLOW_WITH_PROMOCODE', 'BLOCK_IF_PROMOCODE_PRESENT'])
    .nullable()
    .optional(),
  autoRemoveWhenConditionFails: z.boolean().optional(),
  userCanRemoveGiftManually: z.boolean().optional(),
  showOnSite: z.boolean().optional(),
  siteTitle: z.string().nullable().optional(),
  siteDescription: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
})

const deleteSchema = z.object({
  id: z.string().min(1, 'ID обязателен'),
})

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  try {
    const promos = await giftPromotionService.getGiftPromotionsForAdmin(brandId)

    return NextResponse.json(
      promos.map((p) => ({
        ...p,
        validFrom: p.validFrom ?? null,
        validTo: p.validTo ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))
    )
  } catch (error) {
    console.error('Error fetching gift promotions:', error)
    return NextResponse.json({ error: 'Failed to fetch gift promotions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  let data: z.infer<typeof createSchema>
  try {
    const raw = await request.json()
    data = createSchema.parse(raw)
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const giftProduct = await productService.findProductByIdInBrandScope(data.giftProductId, brandId)
    if (!giftProduct) {
      return NextResponse.json({ error: 'Подарочный товар не найден в текущем бренде' }, { status: 400 })
    }
    if (data.triggerType === 'PRODUCT' && data.triggerProductId) {
      const triggerProduct = await productService.findProductByIdInBrandScope(data.triggerProductId, brandId)
      if (!triggerProduct) {
        return NextResponse.json({ error: 'Триггер-товар не найден в текущем бренде' }, { status: 400 })
      }
    }

    const created = await giftPromotionService.createGiftPromotionForAdmin(
      {
        title: data.title,
        status: data.status,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        giftProductId: data.giftProductId,
        triggerType: data.triggerType,
        triggerProductId: data.triggerType === 'PRODUCT' ? data.triggerProductId ?? null : null,
        triggerProductMinQty: data.triggerType === 'PRODUCT' ? data.triggerProductMinQty ?? 1 : null,
        minCartTotal: data.triggerType === 'CART_TOTAL' ? data.minCartTotal ?? 0 : null,
        giftQuantityMode: data.giftQuantityMode,
        maxGiftsPerOrder: data.maxGiftsPerOrder ?? null,
        promoProductInteractionMode: data.promoProductInteractionMode ?? null,
        promoCodeInteractionMode: data.promoCodeInteractionMode ?? null,
        autoRemoveWhenConditionFails: data.autoRemoveWhenConditionFails ?? true,
        userCanRemoveGiftManually: data.userCanRemoveGiftManually ?? false,
        showOnSite: data.showOnSite ?? false,
        siteTitle: data.siteTitle ?? null,
        siteDescription: data.siteDescription ?? null,
        coverImage: data.coverImage ?? null,
      },
      brandId
    )

    return NextResponse.json(created)
  } catch (error) {
    console.error('Error creating gift promotion:', error)
    return NextResponse.json({ error: 'Failed to create gift promotion' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  let data: z.infer<typeof updateSchema>
  try {
    const raw = await request.json()
    data = updateSchema.parse(raw)
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const existing = await giftPromotionService.findGiftPromotionByIdForAdmin(data.id, brandId)
    if (!existing) {
      return NextResponse.json({ error: 'Gift promotion not found' }, { status: 404 })
    }

    const giftProductId = data.giftProductId ?? existing.giftProductId
    const giftProduct = await productService.findProductByIdInBrandScope(giftProductId, brandId)
    if (!giftProduct) {
      return NextResponse.json({ error: 'Подарочный товар не найден в текущем бренде' }, { status: 400 })
    }
    const effectiveTriggerType = data.triggerType ?? existing.triggerType
    const effectiveTriggerProductId =
      effectiveTriggerType === 'PRODUCT' ? (data.triggerProductId ?? existing.triggerProductId) : null
    if (effectiveTriggerProductId) {
      const triggerProduct = await productService.findProductByIdInBrandScope(effectiveTriggerProductId, brandId)
      if (!triggerProduct) {
        return NextResponse.json({ error: 'Триггер-товар не найден в текущем бренде' }, { status: 400 })
      }
    }

    const updated = await giftPromotionService.updateGiftPromotionForAdmin(
      data.id,
      {
        title: data.title ?? existing.title,
        status: data.status ?? existing.status,
        validFrom:
          data.validFrom !== undefined
            ? data.validFrom
              ? new Date(data.validFrom)
              : null
            : existing.validFrom,
        validTo:
          data.validTo !== undefined
            ? data.validTo
              ? new Date(data.validTo)
              : null
            : existing.validTo,
        giftProductId: data.giftProductId ?? existing.giftProductId,
        triggerType: data.triggerType ?? existing.triggerType,
        triggerProductId:
          (data.triggerType ?? existing.triggerType) === 'PRODUCT'
            ? data.triggerProductId ?? existing.triggerProductId
            : null,
        triggerProductMinQty:
          (data.triggerType ?? existing.triggerType) === 'PRODUCT'
            ? data.triggerProductMinQty ?? existing.triggerProductMinQty
            : null,
        minCartTotal:
          (data.triggerType ?? existing.triggerType) === 'CART_TOTAL'
            ? data.minCartTotal ?? existing.minCartTotal
            : null,
        giftQuantityMode: data.giftQuantityMode ?? existing.giftQuantityMode,
        maxGiftsPerOrder: data.maxGiftsPerOrder ?? existing.maxGiftsPerOrder,
        promoProductInteractionMode: data.promoProductInteractionMode ?? existing.promoProductInteractionMode,
        promoCodeInteractionMode: data.promoCodeInteractionMode ?? existing.promoCodeInteractionMode,
        autoRemoveWhenConditionFails:
          data.autoRemoveWhenConditionFails ?? existing.autoRemoveWhenConditionFails,
        userCanRemoveGiftManually: data.userCanRemoveGiftManually ?? existing.userCanRemoveGiftManually,
        showOnSite: data.showOnSite ?? existing.showOnSite,
        siteTitle: data.siteTitle ?? existing.siteTitle,
        siteDescription: data.siteDescription ?? existing.siteDescription,
        coverImage: data.coverImage ?? existing.coverImage,
      },
      brandId
    )

    if (!updated) {
      return NextResponse.json({ error: 'Gift promotion not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating gift promotion:', error)
    return NextResponse.json({ error: 'Failed to update gift promotion' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  let data: z.infer<typeof deleteSchema>
  try {
    const raw = await request.json()
    data = deleteSchema.parse(raw)
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const removed = await giftPromotionService.deleteGiftPromotionForAdmin(data.id, brandId)
    if (!removed) {
      return NextResponse.json({ error: 'Gift promotion not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting gift promotion:', error)
    return NextResponse.json({ error: 'Failed to delete gift promotion' }, { status: 500 })
  }
}

