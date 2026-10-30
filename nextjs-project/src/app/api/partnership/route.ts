import { after, NextResponse } from 'next/server'
import { isBotTrapTriggered, isPlausibleHumanName, isPlausiblePhone, isPlausibleMessage, isValidSocialLinks } from '@/lib/security/public-form-abuse'
import { notifyTelegramForm } from '@/lib/telegram-notify'
import { notifyMaxForm } from '@/lib/max-notify'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { validatePublicEmailDomain } from '@/lib/security/public-email-domain'
import { sanitizeHumanName } from '@/lib/security/input-sanitizers'
import * as partnershipService from '@/services/partnership.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

const PARTNERSHIP_RATE_LIMIT = 5

const emailMax = 254
const roleMax = 120
const socialLinksMax = 2000

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
    let body: Record<string, unknown>
    try {
      const parsed = await request.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return NextResponse.json({ error: 'Некорректные данные формы.' }, { status: 400 })
      }
      body = parsed
    } catch {
      return NextResponse.json({ error: 'Некорректные данные формы.' }, { status: 400 })
    }
    if (isBotTrapTriggered(body)) {
      // Actual visitors should never see success for a rejected timing signal.
      if (!body.website && typeof body.formStartedAt === 'number' && Number.isFinite(body.formStartedAt)) {
        return NextResponse.json({ error: 'Подождите несколько секунд и повторите отправку. Если ошибка повторяется, проверьте часы устройства и обновите страницу.' }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    if (
      (body.name != null && (typeof body.name !== 'string' || body.name.length > 120)) ||
      (body.email != null && (typeof body.email !== 'string' || body.email.length > 254)) ||
      (body.phone != null && (typeof body.phone !== 'string' || body.phone.length > 30)) ||
      (body.role != null && (typeof body.role !== 'string' || body.role.length > 120)) ||
      (body.socialLinks != null && (typeof body.socialLinks !== 'string' || body.socialLinks.length > 2000)) ||
      (body.message != null && (typeof body.message !== 'string' || body.message.length > 2000))
    ) return NextResponse.json({ error: 'Проверьте тип и длину полей формы.' }, { status: 400 })

    const name =
      typeof body.name === 'string' ? sanitizeHumanName(body.name.trim()) : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const phone =
      typeof body.phone === 'string' ? body.phone.trim() : ''
    const role = typeof body.role === 'string' ? body.role.trim().slice(0, roleMax) : null
    const socialLinks =
      typeof body.socialLinks === 'string'
        ? body.socialLinks.trim().slice(0, socialLinksMax)
        : null
    const message =
      typeof body.message === 'string' ? body.message.trim() : null

    if (!isPlausibleHumanName(name)) {
      return NextResponse.json(
        { error: 'Укажите корректное имя.' },
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
    if (!isPlausiblePhone(phone)) {
      return NextResponse.json(
        { error: 'Укажите корректный номер телефона.' },
        { status: 400 }
      )
    }

    if (!isValidSocialLinks(socialLinks ?? '')) {
      return NextResponse.json({ error: 'Укажите @username или HTTP(S)-ссылку на каждой строке.' }, { status: 400 })
    }
    if (!isPlausibleMessage(message ?? '')) {
      return NextResponse.json({ error: 'Введите обычный текст сообщения без HTML и случайных наборов символов.' }, { status: 400 })
    }
    if (role && !['doctor', 'nutritionist', 'health_coach', 'helping_profession', 'fitness_trainer', 'cosmetologist', 'other'].includes(role)) {
      return NextResponse.json({ error: 'Выберите направление деятельности из списка.' }, { status: 400 })
    }

    const repeatKey = email ? email.toLowerCase() : phone.replace(/\D/g, '')
    const repeatRate = await checkRateLimit(repeatKey, 'partnership-form-contact', 2, 60 * 60 * 1000)
    if (!repeatRate.success) {
      return NextResponse.json({ error: 'Заявка уже отправлялась. Попробуйте позже.' }, {
        status: 429, headers: { 'Retry-After': String(repeatRate.resetIn), 'Cache-Control': 'no-store' },
      })
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
