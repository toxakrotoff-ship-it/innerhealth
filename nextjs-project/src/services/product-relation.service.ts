import 'server-only'

import { Prisma, type ProductRelationType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'
import { productBelongsToBrandScope, SPRINT_POWER_PRODUCT_BRAND } from '@/lib/brand/brand-scope'
import { getProductRelationConfig } from '@/lib/product-relations'
import type { ProductVariantForListing } from '@/lib/product-grouping'

const relationCardSelect = Prisma.validator<Prisma.ProductSelect>()({
  id: true,
  parentUid: true,
  title: true,
  brand: true,
  sku: true,
  weight: true,
  price: true,
  priceOld: true,
  quantity: true,
  photo: true,
  photos: true,
  slug: true,
  isPromoEligible: true,
  discountPrice: true,
  isPreorderEnabled: true,
})

type RelationCardRow = Prisma.ProductGetPayload<{ select: typeof relationCardSelect }>

export interface PublishedProductRelationSection {
  type: ProductRelationType
  title: string
  items: ProductVariantForListing[]
}

export interface AdminProductRelation {
  id: string
  relationType: ProductRelationType
  sortOrder: number
  isPublished: boolean
  targetProduct: {
    id: string
    title: string
    slug: string | null
    sku: string | null
    photo: string | null
    isDraft: boolean
    brand: string | null
  }
}

export interface ProductRelationSuggestion {
  id: string
  title: string
  slug: string | null
  sku: string | null
  photo: string | null
  isDraft: boolean
  brand: string | null
}

class ProductRelationError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ProductRelationError'
    this.status = status
  }
}

function buildBrandScopedProductWhere(brandId?: BrandId | null): Prisma.ProductWhereInput {
  if (brandId === 'sprint-power') {
    return { brand: SPRINT_POWER_PRODUCT_BRAND }
  }

  return {
    OR: [{ brand: null }, { brand: { not: SPRINT_POWER_PRODUCT_BRAND } }],
  }
}

function sortRelationSections(sections: PublishedProductRelationSection[]): PublishedProductRelationSection[] {
  return sections.sort((a, b) => {
    const orderDiff = getProductRelationConfig(a.type).order - getProductRelationConfig(b.type).order
    if (orderDiff !== 0) return orderDiff
    return a.title.localeCompare(b.title, 'ru')
  })
}

async function loadScopedProductOrThrow(productId: string, brandId?: BrandId | null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      title: true,
      brand: true,
      isDraft: true,
    },
  })

  if (!product) {
    throw new ProductRelationError('Товар не найден', 404)
  }

  if (!productBelongsToBrandScope(product.brand, brandId)) {
    throw new ProductRelationError('Товар вне выбранного brand scope', 404)
  }

  return product
}

async function validateRelationScope(params: {
  sourceProductId: string
  targetProductId: string
  brandId?: BrandId | null
}) {
  if (params.sourceProductId === params.targetProductId) {
    throw new ProductRelationError('Товар не может быть связан сам с собой')
  }

  const [sourceProduct, targetProduct] = await Promise.all([
    loadScopedProductOrThrow(params.sourceProductId, params.brandId),
    loadScopedProductOrThrow(params.targetProductId, params.brandId),
  ])

  return {
    sourceProduct,
    targetProduct,
    relationBrand: resolveDbBrand(params.brandId),
  }
}

function toRelationCard(row: RelationCardRow): ProductVariantForListing {
  return {
    id: row.id,
    parentUid: row.parentUid,
    title: row.title,
    brand: row.brand,
    sku: row.sku,
    weight: row.weight,
    price: row.price,
    priceOld: row.priceOld,
    quantity: row.quantity,
    photo: row.photo,
    photos: row.photos,
    slug: row.slug,
    isPromoEligible: row.isPromoEligible,
    discountPrice: row.discountPrice,
    isPreorderEnabled: row.isPreorderEnabled,
  }
}

export async function getPublishedProductRelations(params: {
  sourceProductId: string
  brandId?: BrandId | null
}): Promise<PublishedProductRelationSection[]> {
  const rows = await prisma.productRelation.findMany({
    where: {
      sourceProductId: params.sourceProductId,
      brand: resolveDbBrand(params.brandId),
      isPublished: true,
      targetProduct: {
        isDraft: false,
        slug: { not: null },
        ...buildBrandScopedProductWhere(params.brandId),
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: {
      relationType: true,
      sortOrder: true,
      targetProduct: {
        select: relationCardSelect,
      },
    },
  })

  const sectionMap = new Map<ProductRelationType, ProductVariantForListing[]>()

  for (const row of rows) {
    const existing = sectionMap.get(row.relationType) ?? []
    existing.push(toRelationCard(row.targetProduct))
    sectionMap.set(row.relationType, existing)
  }

  return sortRelationSections(
    Array.from(sectionMap.entries()).map(([type, items]) => ({
      type,
      title: getProductRelationConfig(type).title,
      items,
    }))
  )
}

export async function getAdminProductRelations(params: {
  sourceProductId: string
  brandId?: BrandId | null
}): Promise<AdminProductRelation[]> {
  await loadScopedProductOrThrow(params.sourceProductId, params.brandId)

  const rows = await prisma.productRelation.findMany({
    where: {
      sourceProductId: params.sourceProductId,
      brand: resolveDbBrand(params.brandId),
      targetProduct: buildBrandScopedProductWhere(params.brandId),
    },
    orderBy: [
      { relationType: 'asc' },
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    select: {
      id: true,
      relationType: true,
      sortOrder: true,
      isPublished: true,
      targetProduct: {
        select: {
          id: true,
          title: true,
          slug: true,
          sku: true,
          photo: true,
          isDraft: true,
          brand: true,
        },
      },
    },
  })

  return rows.sort((a, b) => {
    const typeDiff =
      getProductRelationConfig(a.relationType).order - getProductRelationConfig(b.relationType).order
    if (typeDiff !== 0) return typeDiff
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.targetProduct.title.localeCompare(b.targetProduct.title, 'ru')
  })
}

export async function suggestProductRelationTargets(params: {
  query: string
  sourceProductId?: string | null
  limit?: number
  brandId?: BrandId | null
}): Promise<ProductRelationSuggestion[]> {
  const q = params.query.trim()
  const take = Math.max(1, Math.min(params.limit ?? 8, 20))
  if (!q) return []

  return prisma.product.findMany({
    where: {
      ...buildBrandScopedProductWhere(params.brandId),
      isDraft: false,
      ...(params.sourceProductId ? { id: { not: params.sourceProductId } } : {}),
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ],
    },
    take,
    orderBy: [{ title: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      photo: true,
      isDraft: true,
      brand: true,
    },
  })
}

export async function createProductRelation(params: {
  sourceProductId: string
  targetProductId: string
  relationType: ProductRelationType
  sortOrder?: number
  isPublished?: boolean
  brandId?: BrandId | null
}) {
  const { relationBrand } = await validateRelationScope(params)

  try {
    return await prisma.productRelation.create({
      data: {
        brand: relationBrand,
        sourceProductId: params.sourceProductId,
        targetProductId: params.targetProductId,
        relationType: params.relationType,
        sortOrder: params.sortOrder ?? 0,
        isPublished: params.isPublished ?? true,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ProductRelationError('Такая связь уже существует')
    }
    throw error
  }
}

async function loadRelationOrThrow(id: string, brandId?: BrandId | null) {
  const relation = await prisma.productRelation.findUnique({
    where: { id },
    select: {
      id: true,
      brand: true,
      sourceProductId: true,
      targetProductId: true,
      relationType: true,
      sourceProduct: {
        select: {
          id: true,
          brand: true,
          slug: true,
        },
      },
      targetProduct: {
        select: {
          id: true,
          brand: true,
        },
      },
    },
  })

  if (!relation) {
    throw new ProductRelationError('Связь не найдена', 404)
  }

  if (
    relation.brand !== resolveDbBrand(brandId) ||
    !productBelongsToBrandScope(relation.sourceProduct.brand, brandId) ||
    !productBelongsToBrandScope(relation.targetProduct.brand, brandId)
  ) {
    throw new ProductRelationError('Связь вне выбранного brand scope', 404)
  }

  return relation
}

export async function updateProductRelation(params: {
  id: string
  relationType?: ProductRelationType
  sortOrder?: number
  isPublished?: boolean
  brandId?: BrandId | null
}) {
  const relation = await loadRelationOrThrow(params.id, params.brandId)
  const nextRelationType = params.relationType ?? relation.relationType

  if (relation.sourceProductId === relation.targetProductId) {
    throw new ProductRelationError('Товар не может быть связан сам с собой')
  }

  try {
    return await prisma.productRelation.update({
      where: { id: params.id },
      data: {
        relationType: nextRelationType,
        sortOrder: params.sortOrder,
        isPublished: params.isPublished,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ProductRelationError('Такая связь уже существует')
    }
    throw error
  }
}

export async function deleteProductRelation(params: { id: string; brandId?: BrandId | null }) {
  await loadRelationOrThrow(params.id, params.brandId)
  return prisma.productRelation.delete({ where: { id: params.id } })
}

export async function reorderProductRelations(params: {
  sourceProductId: string
  items: Array<{ id: string; sortOrder: number }>
  brandId?: BrandId | null
}) {
  await loadScopedProductOrThrow(params.sourceProductId, params.brandId)

  if (params.items.length === 0) return

  const relations = await prisma.productRelation.findMany({
    where: {
      id: { in: params.items.map((item) => item.id) },
      sourceProductId: params.sourceProductId,
      brand: resolveDbBrand(params.brandId),
    },
    select: { id: true },
  })

  if (relations.length !== params.items.length) {
    throw new ProductRelationError('Некоторые связи не найдены', 404)
  }

  await prisma.$transaction(
    params.items.map((item) =>
      prisma.productRelation.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  )
}

export async function getRelationSourceProductSlug(id: string, brandId?: BrandId | null): Promise<string | null> {
  const relation = await loadRelationOrThrow(id, brandId)
  return relation.sourceProduct.slug
}

export async function getSourceProductSlugById(productId: string, brandId?: BrandId | null): Promise<string | null> {
  const product = await loadScopedProductOrThrow(productId, brandId)
  return product.slug
}

export function isProductRelationError(error: unknown): error is ProductRelationError {
  return error instanceof ProductRelationError
}
