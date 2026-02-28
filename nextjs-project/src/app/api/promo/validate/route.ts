import { NextResponse } from 'next/server'
import * as promoService from '@/services/promo.service'
import { validatePromoBodySchema } from '@/lib/validations/promo'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'

const PROMO_VALIDATE_RATE_LIMIT = 30 // requests per minute per IP

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'promo-validate', PROMO_VALIDATE_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { valid: false, error: 'Слишком много попыток. Подождите минуту.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  try {
    const raw = await request.json()
    const parsed = validatePromoBodySchema.safeParse(raw)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.code?.[0] ?? 'Введите промокод'
      return NextResponse.json({ valid: false, error: msg }, { status: 400 })
    }
    const code = parsed.data.code

    const promo = await promoService.findPromoByCode(code)

    if (!promo || !promo.isActive) {
      return NextResponse.json({ valid: false, error: 'Промокод не найден или недействителен' })
    }

    const now = new Date()
    if (promo.validFrom && now < promo.validFrom) {
      return NextResponse.json({ valid: false, error: 'Промокод ещё не действует' })
    }
    if (promo.validTo && now > promo.validTo) {
      return NextResponse.json({ valid: false, error: 'Срок действия промокода истёк' })
    }
    if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
      return NextResponse.json({ valid: false, error: 'Промокод исчерпан' })
    }

    return NextResponse.json({
      valid: true,
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    })
  } catch {
    return NextResponse.json({ valid: false, error: 'Ошибка проверки' }, { status: 500 })
  }
}
