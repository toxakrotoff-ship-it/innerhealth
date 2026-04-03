import { after, NextResponse } from 'next/server'
import { notifyTelegramForm } from '@/lib/telegram-notify'
import { notifyMaxForm } from '@/lib/max-notify'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { validatePublicEmailDomain } from '@/lib/security/public-email-domain'
import { sanitizeHumanName, sanitizePhone } from '@/lib/security/input-sanitizers'
import * as partnershipService from '@/services/partnership.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

const PARTNERSHIP_RATE_LIMIT = 5

const nameMin = 2
const nameMax = 120
const emailMax = 320
const phoneMax = 30
const roleMax = 120
const socialLinksMax = 2000
const messageMax = 2000

export async function POST(request: Request) {
  const brandId = resolveBrandOrDefaultFromRequest(request)
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'partnership-form', PARTNERSHIP_RATE_LIMIT)
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
    const role = typeof body.role === 'string' ? body.role.trim().slice(0, roleMax) : null
    const socialLinks =
      typeof body.socialLinks === 'string'
        ? body.socialLinks.trim().slice(0, socialLinksMax)
        : null
    const message =
      typeof body.message === 'string' ? body.message.trim().slice(0, messageMax) : null

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

    await partnershipService.createPartnershipLead({
      name,
      email,
      phone,
      role: role || undefined,
      socialLinks: socialLinks || undefined,
      message: message || undefined,
    }, brandId)

    const formNotifyPayload = {
      formName: 'Партнёрская заявка',
      fields: {
        Имя: name,
        Email: email,
        Телефон: phone,
        Роль: role ?? '—',
        'Ссылки на соцсети': socialLinks ?? '—',
        Сообщение: message ?? '—',
      },
      brandId,
    } as const
    notifyTelegramForm(formNotifyPayload)
    after(() => notifyMaxForm(formNotifyPayload))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Partnership API error:', e)
    return NextResponse.json(
      { error: 'Не удалось отправить заявку. Попробуйте позже.' },
      { status: 500 }
    )
  }
}
