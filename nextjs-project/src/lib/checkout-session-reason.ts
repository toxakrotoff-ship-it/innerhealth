import type { CheckoutEventType, CheckoutStatus, CheckoutStep } from '@prisma/client'
import { CHECKOUT_STEP_LABELS } from '@/lib/checkout-event-labels'

export interface CheckoutReasonEvent {
  eventType: CheckoutEventType
  metadata: unknown
  createdAt: Date | string
}

export interface CheckoutReasonSession {
  status: CheckoutStatus
  currentStep: CheckoutStep
  events: readonly CheckoutReasonEvent[]
}

const ERROR_EVENT_TYPES: readonly CheckoutEventType[] = [
  'PAYMENT_FAILED',
  'API_ERROR',
  'VALIDATION_ERROR',
  'PAYMENT_PROVIDER_ERROR',
]

function findLastErrorEvent(
  events: readonly CheckoutReasonEvent[]
): CheckoutReasonEvent | undefined {
  return [...events]
    .filter((e) => ERROR_EVENT_TYPES.includes(e.eventType))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
}

/** Короткие русские формулировки по коду из normalizeYookassaError (см. lib/yookassa.ts). */
const PROVIDER_ERROR_LABELS: Record<string, string> = {
  PAYMENT_DECLINED: 'Банк отклонил платёж',
  INSUFFICIENT_FUNDS: 'Недостаточно средств на карте',
  INVALID_CARD_NUMBER: 'Неверный номер карты',
  EXPIRED_CARD: 'Истёк срок действия карты',
  CARD_EXPIRED: 'Истёк срок действия карты',
  GENERAL_DECLINE: 'Платёж отклонён банком',
  FRAUD_SUSPECTED: 'Платёж заблокирован по подозрению в мошенничестве',
  CALL_ISSUER: 'Банк отклонил платёж, обратитесь в банк',
  EXPIRED_ON_CONFIRMATION: 'Время на подтверждение оплаты истекло',
  CANCELED_BY_MERCHANT: 'Платёж отменён продавцом',
}

export function describeProviderError(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return 'Оплата не прошла'
  const record = metadata as Record<string, unknown>
  const code = typeof record.code === 'string' ? record.code : null
  if (code && PROVIDER_ERROR_LABELS[code]) return PROVIDER_ERROR_LABELS[code]
  if (typeof record.message === 'string' && record.message) return record.message
  return 'Оплата не прошла'
}

/**
 * Человеко-читаемая причина незавершённого оформления (ТЗ §15): приоритет —
 * явная ошибка > терминальный статус > застрявший шаг. Используется и в карточке
 * (полный вид), и в списке (компактная колонка «Причина») — не дублировать логику.
 */
export function getCheckoutReason(session: CheckoutReasonSession): string {
  const lastError = findLastErrorEvent(session.events)

  if (session.status === 'PAYMENT_FAILED' && lastError) {
    return `Ошибка оплаты: ${describeProviderError(lastError.metadata)}`
  }
  if (session.status === 'PAYMENT_CANCELLED') {
    return 'Оплата отменена'
  }
  if (session.status === 'COMPLETED') {
    return 'Оформление завершено'
  }
  if (lastError?.eventType === 'API_ERROR') {
    const metadata = lastError.metadata as Record<string, unknown> | null
    const message = typeof metadata?.message === 'string' ? metadata.message : ''
    return `Ошибка checkout API: ${message}`
  }

  switch (session.currentStep) {
    case 'CART':
      return 'Не указал контактные данные'
    case 'CONTACT':
      return 'Указал контакты, но не выбрал доставку'
    case 'DELIVERY':
      return 'Выбрал доставку, но не подтвердил заказ'
    case 'CONFIRMATION':
      return 'Подтвердил, но заказ не создан'
    case 'ORDER_CREATED':
      return 'Заказ создан, но не перешёл к оплате'
    case 'PAYMENT_INITIALIZATION':
    case 'PAYMENT_CREATED':
    case 'PAYMENT_REDIRECT':
    case 'PAYMENT_PROCESSING':
      return 'Перешёл к оплате, но не завершил её'
    default:
      return 'Не продолжил оформление'
  }
}

/** Компактный вариант для колонки «Этап» в списке (PR6) — переиспользует словарь этапов. */
export function getCheckoutStepLabel(step: CheckoutStep): string {
  return CHECKOUT_STEP_LABELS[step]
}

/**
 * Компактная причина для колонки списка (PR6) — без загрузки полного timeline
 * событий (это дорого на каждую строку), поэтому не показывает текст конкретной
 * ошибки провайдера, только терминальный статус/застрявший шаг. Полная версия
 * с деталями ошибки — getCheckoutReason (используется в карточке, PR7).
 */
export function getCheckoutReasonCompact(status: CheckoutStatus, currentStep: CheckoutStep): string {
  return getCheckoutReason({ status, currentStep, events: [] })
}
