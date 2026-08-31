import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { checkoutPromoBodySchema } from '@/lib/validations/checkout-session'
import { CheckoutSessionNotFoundError, trackCheckoutSessionEvent } from '@/lib/checkout-tracking'
import { resolveCheckoutOwnerFromRequest } from '@/lib/checkout-session-request'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import * as promoService from '@/services/promo.service'

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
    const parsed = checkoutPromoBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректные данные' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // Полная проверка (срок действия, лимит) уже сделана клиентом через
    // POST /api/promo/validate — здесь только фиксируем факт применения в трекинге,
    // не дублируя бизнес-логику проверки промокода.
    const brandId = resolveBrandOrDefaultFromRequest(request)
    const promo = await promoService.findPromoByCode(parsed.data.promoCode, brandId)
    if (!promo || !promo.isActive) {
      return NextResponse.json(
        { error: 'Промокод не найден' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const owner = await resolveCheckoutOwnerFromRequest()
    await trackCheckoutSessionEvent(id, owner, 'PROMO_APPLIED', { code: promo.code })

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof CheckoutSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Сессия не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    console.error('[checkout/session/:id/promo] Failed to track promo:', error)
    return NextResponse.json(
      { error: 'Не удалось сохранить промокод' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
