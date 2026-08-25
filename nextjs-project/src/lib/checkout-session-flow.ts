import 'server-only'
import type { Prisma } from '@prisma/client'
import * as checkoutSessionService from '@/services/checkout-session.service'
import type { PaymentProviderError } from '@/lib/checkout-event-metadata'
import { buildPaymentCallbackMetadata, buildPaymentProviderErrorMetadata } from '@/lib/checkout-event-metadata'

/** Источник перехода checkout-статуса — по аналогии с OrderPaymentTransitionSource. */
export type CheckoutTransitionSource = 'client' | 'webhook' | 'cron-scan' | 'admin-sync'

export interface CheckoutTransitionResult {
  changed: boolean
}

export async function trackPaymentInitialized(
  sessionId: string,
  source: CheckoutTransitionSource
): Promise<void> {
  await checkoutSessionService.createEvent(
    sessionId,
    'PAYMENT_INITIALIZATION_STARTED',
    'PAYMENT_INITIALIZATION',
    { source }
  )
  await checkoutSessionService.updateSessionStep(sessionId, 'PAYMENT_INITIALIZATION')
}

export async function trackPaymentCreated(
  sessionId: string,
  source: CheckoutTransitionSource,
  payment: { provider: 'yookassa'; paymentId: string; status: string }
): Promise<void> {
  await checkoutSessionService.updateSessionPayment(sessionId, {
    paymentProvider: payment.provider,
    paymentId: payment.paymentId,
    paymentStatus: payment.status,
  })
  await checkoutSessionService.createEvent(sessionId, 'PAYMENT_CREATED', 'PAYMENT_CREATED', {
    paymentId: payment.paymentId,
    status: payment.status,
    source,
  })
  await checkoutSessionService.updateSessionStep(sessionId, 'PAYMENT_CREATED')
}

export async function trackPaymentRedirected(
  sessionId: string,
  source: CheckoutTransitionSource
): Promise<void> {
  await checkoutSessionService.createEvent(sessionId, 'PAYMENT_REDIRECTED', 'PAYMENT_REDIRECT', {
    source,
  })
  await checkoutSessionService.updateSessionStep(sessionId, 'PAYMENT_REDIRECT')
}

export async function trackPaymentCallback(
  sessionId: string,
  source: CheckoutTransitionSource,
  payload: { status: string; raw?: unknown }
): Promise<void> {
  await checkoutSessionService.createEvent(
    sessionId,
    'PAYMENT_CALLBACK_RECEIVED',
    'PAYMENT_PROCESSING',
    { ...buildPaymentCallbackMetadata(payload), source } as unknown as Prisma.InputJsonValue
  )
  await checkoutSessionService.updateSessionStep(sessionId, 'PAYMENT_PROCESSING')
}

/** Идемпотентно: если сессия уже COMPLETED — {changed:false}, повторный webhook не дублирует событие. */
export async function transitionCheckoutToPaymentSucceeded(
  sessionId: string,
  source: CheckoutTransitionSource
): Promise<CheckoutTransitionResult> {
  const session = await checkoutSessionService.findSessionById(sessionId)
  if (!session) return { changed: false }
  if (session.status === 'COMPLETED') return { changed: false }

  await checkoutSessionService.updateSessionStatus(sessionId, 'COMPLETED')
  await checkoutSessionService.createEvent(sessionId, 'PAYMENT_SUCCEEDED', 'COMPLETED', { source })
  await checkoutSessionService.createEvent(sessionId, 'CHECKOUT_COMPLETED', 'COMPLETED', { source })
  return { changed: true }
}

/** Идемпотентно: если сессия уже COMPLETED/PAYMENT_FAILED — {changed:false}. */
export async function transitionCheckoutToPaymentFailed(
  sessionId: string,
  source: CheckoutTransitionSource,
  error: PaymentProviderError
): Promise<CheckoutTransitionResult> {
  const session = await checkoutSessionService.findSessionById(sessionId)
  if (!session) return { changed: false }
  if (session.status === 'COMPLETED' || session.status === 'PAYMENT_FAILED') {
    return { changed: false }
  }

  await checkoutSessionService.updateSessionStatus(sessionId, 'PAYMENT_FAILED')
  await checkoutSessionService.createEvent(sessionId, 'PAYMENT_FAILED', null, {
    ...buildPaymentProviderErrorMetadata(error),
    source,
  } as unknown as Prisma.InputJsonValue)
  return { changed: true }
}

export async function transitionCheckoutToPaymentCancelled(
  sessionId: string,
  source: CheckoutTransitionSource
): Promise<CheckoutTransitionResult> {
  const session = await checkoutSessionService.findSessionById(sessionId)
  if (!session) return { changed: false }
  if (session.status === 'COMPLETED' || session.status === 'PAYMENT_CANCELLED') {
    return { changed: false }
  }

  await checkoutSessionService.updateSessionStatus(sessionId, 'PAYMENT_CANCELLED')
  await checkoutSessionService.createEvent(sessionId, 'PAYMENT_CANCELLED', null, { source })
  return { changed: true }
}
