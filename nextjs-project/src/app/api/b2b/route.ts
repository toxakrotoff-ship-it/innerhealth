import { after, NextResponse } from 'next/server'
import { notifyTelegramForm } from '@/lib/telegram-notify'
import { notifyMaxForm } from '@/lib/max-notify'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { validatePublicEmailDomain } from '@/lib/security/public-email-domain'
import { sanitizeHumanName, sanitizePhone } from '@/lib/security/input-sanitizers'
import * as b2bService from '@/services/b2b.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

const B2B_RATE_LIMIT = 5

const nameMin = 2
const nameMax = 120
const emailMax = 320
const phoneMax = 30

export async function POST(request: Request) {
  const brandId = resolveBrandOrDefaultFromRequest(request)
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'b2b-form', B2B_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много заявок. Попробуйте позже.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.resetIn),
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  try {
    const body = await request.json()
    const name =
      typeof body.name === 'string' ? sanitizeHumanName(body.name.trim()).slice(0, nameMax) : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const phone =
      typeof body.phone === 'string' ? sanitizePhone(body.phone.trim()).slice(0, phoneMax) : ''

    if (name.length < nameMin || name.length > nameMax) {
      return NextResponse.json(
        { error: `Имя: от ${nameMin} до ${nameMax} символов.` },
        { status: 400 }
      )
    }
    if (!email || email.length > emailMax) {
      return NextResponse.json(
        { error: 'Укажите корректный email.' },
        { status: 400 }
      )
    }
    const emailValidation = await validatePublicEmailDomain(email)
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.userMessage || 'Укажите корректный email.' },
        { status: 400 }
      )
    }
    if (!phone || phone.length > phoneMax) {
      return NextResponse.json(
        { error: 'Укажите номер телефона.' },
        { status: 400 }
      )
    }

    await b2bService.createB2bLead({ name, email, phone }, brandId)

    const formNotifyPayload = {
      formName: 'B2B — заявка на оптовый прайс',
      fields: {
        Имя: name,
        Email: email,
        Телефон: phone,
      },
      brandId,
    } as const
    notifyTelegramForm(formNotifyPayload)
    after(() => notifyMaxForm(formNotifyPayload))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('B2B API error:', e)
    return NextResponse.json(
      { error: 'Не удалось отправить заявку. Попробуйте позже.' },
      { status: 500 }
    )
  }
}
