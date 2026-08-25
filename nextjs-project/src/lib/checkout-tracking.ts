import 'server-only'
import { randomBytes } from 'crypto'
import type { CheckoutEventType, CheckoutSession, CheckoutStep, Prisma } from '@prisma/client'
import type { BrandId } from '@/lib/brand/brand'
import * as checkoutSessionService from '@/services/checkout-session.service'
import type { PaymentProviderError } from '@/lib/checkout-event-metadata'

export const CHECKOUT_GUEST_COOKIE_NAME = 'ih_checkout_token'
/** TTL гостевой cookie — совпадает с дефолтным retention-сроком сессии (см. этап 8). */
export const CHECKOUT_GUEST_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export class CheckoutSessionNotFoundError extends Error {
  constructor() {
    super('Checkout session not found')
    this.name = 'CheckoutSessionNotFoundError'
  }
}

/** Владелец сессии — гость по httpOnly cookie-токену или залогиненный пользователь. */
export interface CheckoutOwnerContext {
  guestToken: string | null
  userId: string | null
}

function generateGuestToken(): string {
  return randomBytes(24).toString('base64url')
}

/** touchActivity + событие CHECKOUT_REACTIVATED, если сессия реактивировалась из ABANDONED. */
async function touchActivityAndTrackReactivation(sessionId: string): Promise<void> {
  const { reactivated } = await checkoutSessionService.touchActivity(sessionId)
  if (reactivated) {
    await checkoutSessionService.createEvent(sessionId, 'CHECKOUT_REACTIVATED')
  }
}

async function resolveOwnedSession(
  sessionId: string,
  owner: CheckoutOwnerContext
): Promise<CheckoutSession> {
  const session = await checkoutSessionService.findSessionById(sessionId)
  if (!session) throw new CheckoutSessionNotFoundError()

  const ownsByUser = owner.userId != null && session.userId === owner.userId
  const ownsByGuestToken = owner.guestToken != null && session.guestToken === owner.guestToken
  if (!ownsByUser && !ownsByGuestToken) throw new CheckoutSessionNotFoundError()

  return session
}

/**
 * Начинает или переиспользует checkout-сессию. Для залогиненного пользователя — по
 * userId; для гостя — по guestToken (генерирует новый, если не передан/невалиден).
 * При логине гостя с активной гостевой сессией — переиспользует её, не плодит вторую.
 */
export async function startCheckout(params: {
  brand: BrandId
  userId?: string | null
  guestToken?: string | null
}): Promise<{ session: CheckoutSession; guestToken: string | null }> {
  const userId = params.userId ?? null

  if (userId) {
    const existingByUser = await checkoutSessionService.findActiveSessionByUserId(
      userId,
      params.brand
    )
    if (existingByUser) {
      await touchActivityAndTrackReactivation(existingByUser.id)
      return { session: existingByUser, guestToken: null }
    }

    if (params.guestToken) {
      const guestSession = await checkoutSessionService.findActiveSessionByGuestToken(
        params.guestToken,
        params.brand
      )
      if (guestSession) {
        const claimed = await checkoutSessionService.claimSessionForUser(guestSession.id, userId)
        await touchActivityAndTrackReactivation(claimed.id)
        return { session: claimed, guestToken: null }
      }
    }

    const created = await checkoutSessionService.createSession({ brand: params.brand, userId })
    await checkoutSessionService.createEvent(created.id, 'CHECKOUT_STARTED', 'CART')
    return { session: created, guestToken: null }
  }

  if (params.guestToken) {
    const existingByGuest = await checkoutSessionService.findActiveSessionByGuestToken(
      params.guestToken,
      params.brand
    )
    if (existingByGuest) {
      await touchActivityAndTrackReactivation(existingByGuest.id)
      return { session: existingByGuest, guestToken: params.guestToken }
    }
  }

  const guestToken = generateGuestToken()
  const created = await checkoutSessionService.createSession({ brand: params.brand, guestToken })
  await checkoutSessionService.createEvent(created.id, 'CHECKOUT_STARTED', 'CART')
  return { session: created, guestToken }
}

export async function updateCheckoutContact(
  sessionId: string,
  owner: CheckoutOwnerContext,
  contact: { fullName?: string; phone?: string; email?: string }
): Promise<CheckoutSession> {
  await resolveOwnedSession(sessionId, owner)
  await checkoutSessionService.updateSessionContact(sessionId, contact)
  await touchActivityAndTrackReactivation(sessionId)
  await checkoutSessionService.createEvent(sessionId, 'CONTACT_ENTERED', 'CONTACT')
  const updated = await checkoutSessionService.updateSessionStep(sessionId, 'CONTACT')
  return updated!
}

export interface CartSnapshotInput {
  cartSnapshot: Prisma.InputJsonValue
  cartItemsCount: number
  cartTotal?: number | null
  deliveryMethod?: string | null
  deliverySum?: number | null
  promoCode?: string | null
}

export async function updateCheckoutCart(
  sessionId: string,
  owner: CheckoutOwnerContext,
  cart: CartSnapshotInput
): Promise<CheckoutSession> {
  await resolveOwnedSession(sessionId, owner)
  const updated = await checkoutSessionService.updateSessionCart(sessionId, cart)
  await touchActivityAndTrackReactivation(sessionId)
  return updated
}

/** Владением-проверенный переход шага + событие. Используется PATCH-роутами (delivery). */
export async function trackCheckoutStep(
  sessionId: string,
  owner: CheckoutOwnerContext,
  step: CheckoutStep,
  eventType: CheckoutEventType,
  metadata?: Prisma.InputJsonValue
): Promise<CheckoutSession> {
  await resolveOwnedSession(sessionId, owner)
  await touchActivityAndTrackReactivation(sessionId)
  await checkoutSessionService.createEvent(sessionId, eventType, step, metadata)
  const updated = await checkoutSessionService.updateSessionStep(sessionId, step)
  return updated!
}

/** Владением-проверенное событие без смены шага. Используется PATCH-роутом промокода. */
export async function trackCheckoutSessionEvent(
  sessionId: string,
  owner: CheckoutOwnerContext,
  eventType: CheckoutEventType,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  await resolveOwnedSession(sessionId, owner)
  await touchActivityAndTrackReactivation(sessionId)
  await checkoutSessionService.createEvent(sessionId, eventType, null, metadata)
}

/**
 * Событие без проверки владения — для доверенных backend-путей, где sessionId уже
 * получен не от клиента напрямую, а через собственный трастовый лукап (создание
 * заказа по checkoutSessionId из тела, webhook по orderId и т.п.).
 */
export async function trackCheckoutEvent(
  sessionId: string,
  eventType: CheckoutEventType,
  step?: CheckoutStep,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  await checkoutSessionService.createEvent(sessionId, eventType, step ?? null, metadata)
}

export type BackendCheckoutError = {
  source: 'backend'
  endpoint: string
  code: string
  message: string
  httpStatus: number
}
export type ProviderCheckoutError = { source: 'payment_provider' } & PaymentProviderError
export type CheckoutTrackedError = BackendCheckoutError | ProviderCheckoutError

export async function trackCheckoutError(
  sessionId: string,
  error: CheckoutTrackedError
): Promise<void> {
  const eventType: CheckoutEventType =
    error.source === 'payment_provider' ? 'PAYMENT_PROVIDER_ERROR' : 'API_ERROR'
  await checkoutSessionService.createEvent(
    sessionId,
    eventType,
    null,
    error as unknown as Prisma.InputJsonValue
  )
}

/** Владением-проверенная линковка сессии с созданным заказом (см. POST /api/orders). */
export async function linkCheckoutOrder(
  sessionId: string,
  owner: CheckoutOwnerContext,
  orderId: string
): Promise<void> {
  await resolveOwnedSession(sessionId, owner)
  await checkoutSessionService.linkOrder(sessionId, orderId)
}

/** Финализирует checkout без онлайн-оплаты (заказ создан и это последний шаг воронки). */
export async function completeCheckout(sessionId: string, orderId: string): Promise<void> {
  await checkoutSessionService.linkOrder(sessionId, orderId)
  await checkoutSessionService.updateSessionStatus(sessionId, 'COMPLETED')
  await checkoutSessionService.createEvent(sessionId, 'CHECKOUT_COMPLETED', 'COMPLETED')
}
