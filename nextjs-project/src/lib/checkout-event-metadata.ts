import 'server-only'

/**
 * Централизованный whitelist для всего, что попадает в CheckoutEvent.metadata.
 * Явные аллоу-листы полей на источник, а не блок-лист — безопаснее по умолчанию.
 * Никогда не пробрасывать `JSON.stringify(payload)`/spread целого provider-объекта:
 * там могут быть payment_method (маскированный номер карты/токен), confirmation,
 * receipt и прочие PII/платёжные секреты.
 */

export interface PaymentProviderError {
  code: string
  message: string
  httpStatus?: number
  providerStatus?: string
}

export function buildPaymentProviderErrorMetadata(
  error: PaymentProviderError
): Record<string, unknown> {
  return {
    code: error.code,
    message: error.message,
    providerStatus: error.providerStatus ?? null,
  }
}

/** Только id/status callback'а — НЕ payment_method/confirmation/receipt/metadata провайдера. */
export function buildPaymentCallbackMetadata(payload: {
  status: string
  raw?: unknown
}): Record<string, unknown> {
  return { status: payload.status }
}
