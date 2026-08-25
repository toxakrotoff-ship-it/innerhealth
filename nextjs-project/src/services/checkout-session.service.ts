import 'server-only'
import type {
  CheckoutEventType,
  CheckoutSession,
  CheckoutStatus,
  CheckoutStep,
  Prisma,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'

/** Порядок шагов checkout — используется, чтобы lastCompletedStep никогда не откатывался назад. */
const CHECKOUT_STEP_ORDER: readonly CheckoutStep[] = [
  'CART',
  'CONTACT',
  'DELIVERY',
  'CONFIRMATION',
  'ORDER_CREATED',
  'PAYMENT_INITIALIZATION',
  'PAYMENT_CREATED',
  'PAYMENT_REDIRECT',
  'PAYMENT_PROCESSING',
  'COMPLETED',
]

function stepIndex(step: CheckoutStep): number {
  return CHECKOUT_STEP_ORDER.indexOf(step)
}

/** Статусы, из которых сессию можно переиспользовать при повторном заходе (не терминальные). */
const REUSABLE_STATUS_FILTER: Prisma.CheckoutSessionWhereInput['status'] = {
  notIn: ['COMPLETED', 'EXPIRED'],
}

export async function findActiveSessionByGuestToken(
  guestToken: string,
  brand: BrandId
): Promise<CheckoutSession | null> {
  return prisma.checkoutSession.findFirst({
    where: { guestToken, brand, status: REUSABLE_STATUS_FILTER },
  })
}

export async function findActiveSessionByUserId(
  userId: string,
  brand: BrandId
): Promise<CheckoutSession | null> {
  return prisma.checkoutSession.findFirst({
    where: { userId, brand, status: REUSABLE_STATUS_FILTER },
    orderBy: { createdAt: 'desc' },
  })
}

export async function findSessionById(id: string): Promise<CheckoutSession | null> {
  return prisma.checkoutSession.findUnique({ where: { id } })
}

export async function findSessionByOrderId(orderId: string): Promise<CheckoutSession | null> {
  return prisma.checkoutSession.findUnique({ where: { orderId } })
}

export async function createSession(input: {
  brand: BrandId
  userId?: string | null
  guestToken?: string | null
  anonId?: string | null
}): Promise<CheckoutSession> {
  return prisma.checkoutSession.create({
    data: {
      brand: input.brand,
      userId: input.userId ?? null,
      guestToken: input.guestToken ?? null,
      anonId: input.anonId ?? null,
    },
  })
}

/** Гость заходит под своим аккаунтом — переиспользуем его гостевую сессию, не плодим вторую. */
export async function claimSessionForUser(id: string, userId: string): Promise<CheckoutSession> {
  return prisma.checkoutSession.update({ where: { id }, data: { userId } })
}

export async function updateSessionContact(
  id: string,
  data: { fullName?: string; phone?: string; email?: string }
): Promise<CheckoutSession> {
  return prisma.checkoutSession.update({ where: { id }, data })
}

export async function updateSessionCart(
  id: string,
  data: {
    cartSnapshot: Prisma.InputJsonValue
    cartItemsCount: number
    cartTotal?: number | null
    deliveryMethod?: string | null
    deliverySum?: number | null
    promoCode?: string | null
  }
): Promise<CheckoutSession> {
  return prisma.checkoutSession.update({ where: { id }, data })
}

/**
 * Переводит сессию на новый шаг. Считаем шаг «пройденным» в момент, когда до него
 * дошли (checkout — линейный), поэтому currentStep всегда обновляется, а
 * lastCompletedStep — только вперёд, никогда не откатывается назад повторным PATCH
 * более раннего шага.
 */
export async function updateSessionStep(
  id: string,
  step: CheckoutStep
): Promise<CheckoutSession | null> {
  const existing = await prisma.checkoutSession.findUnique({
    where: { id },
    select: { lastCompletedStep: true },
  })
  if (!existing) return null

  const prevIndex = existing.lastCompletedStep ? stepIndex(existing.lastCompletedStep) : -1
  const nextIndex = stepIndex(step)
  const lastCompletedStep = nextIndex > prevIndex ? step : existing.lastCompletedStep

  return prisma.checkoutSession.update({
    where: { id },
    data: { currentStep: step, lastCompletedStep },
  })
}

export async function updateSessionStatus(
  id: string,
  status: CheckoutStatus
): Promise<CheckoutSession> {
  return prisma.checkoutSession.update({ where: { id }, data: { status } })
}

export async function linkOrder(id: string, orderId: string): Promise<CheckoutSession> {
  return prisma.checkoutSession.update({ where: { id }, data: { orderId } })
}

export async function updateSessionPayment(
  id: string,
  data: { paymentProvider?: string; paymentId?: string; paymentStatus?: string }
): Promise<CheckoutSession> {
  return prisma.checkoutSession.update({ where: { id }, data })
}

/** Обновляет lastActivityAt; если сессия была ABANDONED — реактивирует (ABANDONED -> ACTIVE). */
export async function touchActivity(id: string): Promise<{ reactivated: boolean }> {
  const existing = await prisma.checkoutSession.findUnique({
    where: { id },
    select: { status: true },
  })
  if (!existing) return { reactivated: false }

  const wasAbandoned = existing.status === 'ABANDONED'
  await prisma.checkoutSession.update({
    where: { id },
    data: {
      lastActivityAt: new Date(),
      ...(wasAbandoned ? { status: 'ACTIVE' as const } : {}),
    },
  })
  return { reactivated: wasAbandoned }
}

export async function createEvent(
  sessionId: string,
  eventType: CheckoutEventType,
  step?: CheckoutStep | null,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  await prisma.checkoutEvent.create({
    data: { checkoutSessionId: sessionId, eventType, step: step ?? null, metadata },
  })
}

export async function findSessionForAdmin(id: string, brand: BrandId) {
  return prisma.checkoutSession.findFirst({
    where: { id, brand },
    include: {
      events: { orderBy: { createdAt: 'asc' } },
      order: { select: { id: true, orderNumber: true, status: true } },
    },
  })
}

const DEFAULT_LIST_STATUSES: CheckoutStatus[] = [
  'ACTIVE',
  'ABANDONED',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'EXPIRED',
]

export interface ListCheckoutSessionsFilters {
  brand: BrandId
  dateFrom?: Date
  dateTo?: Date
  statuses?: CheckoutStatus[]
  steps?: CheckoutStep[]
  hasPhone?: boolean
  hasEmail?: boolean
  hasOrder?: boolean
  hasPayment?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export async function listSessionsForAdmin(filters: ListCheckoutSessionsFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 200) : 50

  const where: Prisma.CheckoutSessionWhereInput = { brand: filters.brand }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    }
  }

  where.status = {
    in: filters.statuses && filters.statuses.length > 0 ? filters.statuses : DEFAULT_LIST_STATUSES,
  }

  if (filters.steps && filters.steps.length > 0) {
    where.currentStep = { in: filters.steps }
  }
  if (filters.hasPhone) where.phone = { not: null }
  if (filters.hasEmail) where.email = { not: null }
  if (filters.hasOrder) where.orderId = { not: null }
  if (filters.hasPayment) where.paymentId = { not: null }

  const term = filters.search?.trim()
  if (term) {
    const orderNumber = Number(term)
    where.OR = [
      { phone: { contains: term } },
      { email: { contains: term, mode: 'insensitive' } },
      { fullName: { contains: term, mode: 'insensitive' } },
      { paymentId: { contains: term } },
      ...(Number.isFinite(orderNumber) ? [{ order: { orderNumber } }] : []),
    ]
  }

  const [items, total] = await Promise.all([
    prisma.checkoutSession.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { order: { select: { id: true, orderNumber: true } } },
    }),
    prisma.checkoutSession.count({ where }),
  ])

  return { items, total, page, pageSize }
}

/** Сессии, зависшие в ACTIVE дольше таймаута — кандидаты на пометку ABANDONED (см. cron-скан). */
export async function findStaleActiveSessions(params: {
  olderThan: Date
  brand?: BrandId
  take: number
}): Promise<Array<Pick<CheckoutSession, 'id' | 'currentStep'>>> {
  return prisma.checkoutSession.findMany({
    where: {
      status: 'ACTIVE',
      lastActivityAt: { lt: params.olderThan },
      ...(params.brand ? { brand: params.brand } : {}),
    },
    select: { id: true, currentStep: true },
    take: params.take,
    orderBy: { lastActivityAt: 'asc' },
  })
}

/** Атомарно помечает набор сессий ABANDONED, только если они всё ещё ACTIVE (защита от гонки с touchActivity). */
export async function markSessionsAbandoned(ids: string[]): Promise<{ count: number }> {
  if (ids.length === 0) return { count: 0 }
  return prisma.checkoutSession.updateMany({
    where: { id: { in: ids }, status: 'ACTIVE' },
    data: { status: 'ABANDONED' },
  })
}
