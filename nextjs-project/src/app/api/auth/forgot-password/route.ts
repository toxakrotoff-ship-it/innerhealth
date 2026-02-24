import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail, getBaseUrlForEmails } from '@/lib/email'
import {
  generateSecureToken,
  hashToken,
  getExpiresAt,
  EXPIRES_MINUTES,
} from '@/lib/password-reset'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

const bodySchema = z.object({ email: z.string().email().max(254).trim().toLowerCase() })
const RATE_LIMIT = 5 // requests per minute per IP

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = checkRateLimit(clientId, 'forgot-password', RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите корректный email' }, { status: 400 })
  }
  const { email } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ message: 'Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля.' })
  }

  const secret = generateSecureToken()
  const tokenHash = await hashToken(secret)
  const record = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: getExpiresAt(),
    },
  })

  const baseUrl = getBaseUrlForEmails(request)
  const resetLink = `${baseUrl}/login/reset-password?token=${encodeURIComponent(record.id + '.' + secret)}`
  const sendResult = await sendPasswordResetEmail(user.email, resetLink, EXPIRES_MINUTES)
  if (!sendResult.ok) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } })
    console.error('[forgot-password] Send failed:', sendResult.error)
    return NextResponse.json(
      {
        error:
          process.env.SMTP_HOST
            ? 'Не удалось отправить письмо. Проверьте SMTP настройки и логи сервера.'
            : 'Отправка писем не настроена. Добавьте SMTP_HOST, SMTP_USER, SMTP_PASS в .env.local (см. docs/password-reset-env.md).',
      },
      { status: 500 }
    )
  }

  console.log('[forgot-password] Reset email sent to', user.email)
  return NextResponse.json({
    message: 'Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля.',
  })
}
