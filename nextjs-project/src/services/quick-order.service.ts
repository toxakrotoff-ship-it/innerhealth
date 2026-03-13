import 'server-only'
import { prisma } from '@/lib/prisma'
import { maskPhone } from '@/lib/pii-masking'

export interface QuickOrderInput {
  name?: string
  phone: string
  comment?: string
  productId: string
  quantity: number
}

export async function createQuickOrder(input: QuickOrderInput) {
  return prisma.quickOrder.create({
    data: {
      name: input.name,
      phone: input.phone,
      comment: input.comment,
      productId: input.productId,
      quantity: input.quantity,
    },
  })
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

export async function getQuickOrdersForAdmin(): Promise<AdminQuickOrderDto[]> {
  const rows = await prisma.quickOrder.findMany({
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
