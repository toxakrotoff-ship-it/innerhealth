import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { checkoutDeliveryBodySchema } from '@/lib/validations/checkout-session'
import { CheckoutSessionNotFoundError, trackCheckoutStep } from '@/lib/checkout-tracking'
import { resolveCheckoutOwnerFromRequest } from '@/lib/checkout-session-request'

const PATCH_RATE_LIMIT = 60 // requests per minute per IP

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'checkout-session-patch', PATCH_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn), 'Cache-Control': 'no-store' } }
    )
  }

  const { id } = await params

  try {
    const raw = await request.json()
    const parsed = checkoutDeliveryBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректные данные' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const owner = await resolveCheckoutOwnerFromRequest()
    const updated = await trackCheckoutStep(id, owner, 'DELIVERY', 'DELIVERY_SELECTED', {
      deliveryMethod: parsed.data.deliveryMethod,
      deliverySum: parsed.data.deliverySum ?? null,
    })

    return NextResponse.json({ id: updated.id }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof CheckoutSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Сессия не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    console.error('[checkout/session/:id/delivery] Failed to track delivery step:', error)
    return NextResponse.json(
      { error: 'Не удалось сохранить доставку' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
