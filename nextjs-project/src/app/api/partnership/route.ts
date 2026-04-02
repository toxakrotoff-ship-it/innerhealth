import { after, NextResponse } from 'next/server'
import { notifyTelegramForm } from '@/lib/telegram-notify'
import { notifyMaxForm } from '@/lib/max-notify'
import * as partnershipService from '@/services/partnership.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

const PARTNERSHIP_RATE_LIMIT = 5
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return ip
}

function checkRateLimit(clientId: string): { success: boolean } {
  const now = Date.now()
  const windowMs = 60_000
  let entry = rateLimitMap.get(clientId)
  if (!entry) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + windowMs })
    return { success: true }
  }
  if (now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs }
    rateLimitMap.set(clientId, entry)
    return { success: true }
  }
  entry.count += 1
  if (entry.count > PARTNERSHIP_RATE_LIMIT) return { success: false }
  return { success: true }
}

const nameMin = 2
const nameMax = 120
const emailMax = 320
const phoneMax = 30
const roleMax = 120
const socialLinksMax = 2000
const messageMax = 2000

export async function POST(request: Request) {
  const brandId = resolveBrandOrDefaultFromRequest(request)
  const clientId = getClientId(request)
  if (!checkRateLimit(clientId).success) {
    return NextResponse.json(
      { error: 'Слишком много заявок. Попробуйте позже.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
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
    const emailSimple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailSimple.test(email)) {
      return NextResponse.json(
        { error: 'Некорректный формат email.' },
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
