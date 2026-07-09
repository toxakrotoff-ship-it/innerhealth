import { after, NextResponse } from 'next/server'
import { notifyTelegramForm } from '@/lib/telegram-notify'
import { notifyMaxForm } from '@/lib/max-notify'
import { sendContactHelpNotification } from '@/lib/email'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { validatePublicEmailDomain } from '@/lib/security/public-email-domain'
import { getPhoneDigits, validatePhoneRu } from '@/lib/phone-mask'
import { sanitizeHumanName, sanitizePhone } from '@/lib/security/input-sanitizers'
import * as contactHelpService from '@/services/contact-help.service'
import * as userService from '@/services/user.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

const CONTACT_HELP_RATE_LIMIT = 5

const nameMin = 2
const nameMax = 120
const emailMax = 320
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
    const body = await request.json()
    const name =
      typeof body.name === 'string' ? sanitizeHumanName(body.name.trim()).slice(0, nameMax) : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const phone =
      typeof body.phone === 'string' ? sanitizePhone(body.phone.trim()).slice(0, phoneMax) : ''
    const message =
      typeof body.message === 'string' ? body.message.trim().slice(0, messageMax) : ''

    if (name.length < nameMin || name.length > nameMax) {
      return NextResponse.json(
        { error: `Имя: от ${nameMin} до ${nameMax} символов.` },
        { status: 400 }
      )
    }
    const hasEmail = email.length > 0
    const hasPhone = getPhoneDigits(phone).length > 1

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
      if (!phoneValidation.valid) {
        return NextResponse.json(
          { error: phoneValidation.message },
          { status: 400 }
        )
      }
    }
    if (message.length < messageMin || message.length > messageMax) {
      return NextResponse.json(
        { error: `Вопрос: от ${messageMin} до ${messageMax} символов.` },
        { status: 400 }
      )
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
      const adminEmails = await userService.getAdminNotificationEmails()
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
