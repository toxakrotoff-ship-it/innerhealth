import 'server-only'
import { prisma } from '@/lib/prisma'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

export const ACCOUNT_SERVICE_ERROR_CODES = {
  orderNotFound: 'ORDER_NOT_FOUND',
} as const

export interface AccountServiceError extends Error {
  code: (typeof ACCOUNT_SERVICE_ERROR_CODES)[keyof typeof ACCOUNT_SERVICE_ERROR_CODES]
}

export interface GetUserOrdersParams {
  page?: number
  pageSize?: number
}

function createAccountServiceError(
  code: AccountServiceError['code'],
  message: string
): AccountServiceError {
  return Object.assign(new Error(message), { code })
}

function normalizePagination(params?: GetUserOrdersParams): { page: number; pageSize: number } {
  const rawPage = params?.page ?? DEFAULT_PAGE
  const rawPageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE
  const page = Math.max(DEFAULT_PAGE, Math.floor(rawPage))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(rawPageSize)))
  return { page, pageSize }
}

export async function getAccountDashboard(userId: string) {
  const [user, orderCount, totalSpent, latestOrders] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        phone: true,
        emailVerifiedAt: true,
      },
    }),
    prisma.order.count({
      where: { userId },
    }),
    prisma.order.aggregate({
      where: { userId },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        cdekOrderUuid: true,
        cdekTrackNumber: true,
      },
    }),
  ])

  return {
    user,
    stats: {
      orderCount,
      totalSpent: totalSpent._sum.total ?? 0,
    },
    latestOrders,
  }
}

export async function getUserOrders(userId: string, params?: GetUserOrdersParams) {
  const { page, pageSize } = normalizePagination(params)
  const skip = (page - 1) * pageSize

  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        shippingInfo: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                photo: true,
              },
            },
          },
        },
      },
    }),
    prisma.order.count({
      where: { userId },
    }),
  ])

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export async function getUserOrderById(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      promoCode: true,
      shippingInfo: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  if (!order) {
    throw createAccountServiceError(ACCOUNT_SERVICE_ERROR_CODES.orderNotFound, 'User order not found')
  }

  return order
}
