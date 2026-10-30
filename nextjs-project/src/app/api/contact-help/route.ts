import { after, NextResponse } from 'next/server'
import { isBotTrapTriggered, isPlausibleHumanName, isPlausiblePhone, isPlausibleMessage } from '@/lib/security/public-form-abuse'
import { notifyTelegramForm } from '@/lib/telegram-notify'
import { notifyMaxForm } from '@/lib/max-notify'
import { sendContactHelpNotification } from '@/lib/email'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { validatePublicEmailDomain } from '@/lib/security/public-email-domain'
import { validatePhoneRu } from '@/lib/phone-mask'
import { sanitizeHumanName } from '@/lib/security/input-sanitizers'
import * as contactHelpService from '@/services/contact-help.service'
import * as userService from '@/services/user.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

const CONTACT_HELP_RATE_LIMIT = 5

const emailMax = 254
const phoneMax = 30
const messageMin = 5
const messageMax = 2000

export async function POST(request: Request) {
  const brandId = resolveBrandOrDefaultFromRequest(request)
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'contact-help-form', CONTACT_HELP_RATE_LIMIT)
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
      (body.message != null && (typeof body.message !== 'string' || body.message.length > 2000))
    ) return NextResponse.json({ error: 'Проверьте тип и длину полей формы.' }, { status: 400 })

    const name =
      typeof body.name === 'string' ? sanitizeHumanName(body.name.trim()) : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const phone =
      typeof body.phone === 'string' ? body.phone.trim() : ''
    const message =
      typeof body.message === 'string' ? body.message.trim() : ''

    if (!isPlausibleHumanName(name)) {
      return NextResponse.json(
        { error: 'Укажите корректное имя.' },
        { status: 400 }
      )
    }
    const hasEmail = email.length > 0
    const hasPhone = phone.length > 0 && phone !== '+7'

    if (!hasEmail && !hasPhone) {
      return NextResponse.json(
        { error: 'Укажите email или номер телефона.' },
        { status: 400 }
      )
    }

    if (hasEmail) {
      if (email.length > emailMax) {
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
    }

    if (hasPhone) {
      if (phone.length > phoneMax) {
        return NextResponse.json(
          { error: 'Укажите номер телефона.' },
          { status: 400 }
        )
      }
      const phoneValidation = validatePhoneRu(phone)
      if (phoneValidation.valid === false) {
        return NextResponse.json(
          { error: phoneValidation.message },
          { status: 400 }
        )
      }
    }
    if (hasPhone && !isPlausiblePhone(phone)) {
      return NextResponse.json({ error: 'Укажите корректный номер телефона.' }, { status: 400 })
    }
    if (!isPlausibleMessage(message)) {
      return NextResponse.json({ error: 'Введите обычный текст вопроса без HTML и случайных наборов символов.' }, { status: 400 })
    }
    if (message.length < messageMin || message.length > messageMax) {
      return NextResponse.json(
        { error: `Вопрос: от ${messageMin} до ${messageMax} символов.` },
        { status: 400 }
      )
    }

    const repeatKey = email ? email.toLowerCase() : phone.replace(/\D/g, '')
    const repeatRate = await checkRateLimit(repeatKey, 'contact-help-form-contact', 2, 60 * 60 * 1000)
    if (!repeatRate.success) {
      return NextResponse.json({ error: 'Заявка уже отправлялась. Попробуйте позже.' }, {
        status: 429, headers: { 'Retry-After': String(repeatRate.resetIn), 'Cache-Control': 'no-store' },
      })
    }

    const normalizedEmail = hasEmail ? email : ''
    const normalizedPhone = hasPhone ? phone : ''

    await contactHelpService.createContactHelpLead(
      {
        name,
        email: normalizedEmail,
        phone: normalizedPhone,
        message,
      },
      brandId
    )

    const formNotifyPayload = {
      formName: 'Вопрос с сайта',
      fields: {
        Имя: name,
        ...(normalizedEmail ? { Email: normalizedEmail } : {}),
        ...(normalizedPhone ? { Телефон: normalizedPhone } : {}),
        Вопрос: message,
      },
      brandId,
    } as const
    notifyTelegramForm(formNotifyPayload)
    after(() => notifyMaxForm(formNotifyPayload))

    after(async () => {
      const adminEmails = await userService.getAdminNotificationEmails(brandId)
      await sendContactHelpNotification(adminEmails, {
        name,
        email: normalizedEmail,
        phone: normalizedPhone,
        message,
        brandId,
      })
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Contact help API error:', e)
    return NextResponse.json(
      { error: 'Не удалось отправить заявку. Попробуйте позже.' },
      { status: 500 }
    )
  }
}
