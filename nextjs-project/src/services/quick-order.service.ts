import 'server-only'
import { prisma } from '@/lib/prisma'

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

export async function getQuickOrdersForAdmin() {
  return prisma.quickOrder.findMany({
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
}
