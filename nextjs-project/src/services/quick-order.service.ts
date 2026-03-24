import 'server-only'
import { prisma } from '@/lib/prisma'
import { maskPhone } from '@/lib/pii-masking'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'
import { productBelongsToBrandScope } from '@/lib/brand/brand-scope'

export interface QuickOrderInput {
  name?: string
  phone: string
  comment?: string
  productId: string
  quantity: number
}

export async function createQuickOrder(input: QuickOrderInput, brandId: BrandId | null = null) {
  return prisma.quickOrder.create({
    data: {
      brand: resolveDbBrand(brandId),
      name: input.name,
      phone: input.phone,
      comment: input.comment,
      productId: input.productId,
      quantity: input.quantity,
    },
  })
}

export async function getQuickOrderProductAvailability(
  productId: string,
  brandId: BrandId | null = null
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      isDraft: true,
      quantity: true,
      isPreorderEnabled: true,
      brand: true,
    },
  })
  if (!product) return null
  if (!productBelongsToBrandScope(product.brand, brandId)) return null
  return product
}

export interface AdminQuickOrderDto {
  id: string
  name: string | null
  phoneMasked: string
  comment: string | null
  status: string
  quantity: number
  createdAt: string
  product: {
    id: string
    title: string
    slug: string | null
    price: number
  }
}

export async function getQuickOrdersForAdmin(
  brandId: BrandId | null = null
): Promise<AdminQuickOrderDto[]> {
  const rows = await prisma.quickOrder.findMany({
    where: { brand: resolveDbBrand(brandId) },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
        },
      },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? null,
    phoneMasked: maskPhone(row.phone),
    comment: row.comment ?? null,
    status: row.status,
    quantity: row.quantity,
    createdAt: row.createdAt.toISOString(),
    product: {
      id: row.product.id,
      title: row.product.title,
      slug: row.product.slug,
      price: row.product.price,
    },
  }))
}
