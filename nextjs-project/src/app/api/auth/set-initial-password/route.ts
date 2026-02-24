import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTokenHash } from '@/lib/set-initial-password'
import { hashPassword } from '@/lib/password'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Минимум 6 символов').max(128),
})
const RATE_LIMIT = 10

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = checkRateLimit(clientId, 'set-initial-password', RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.password?.[0] ?? 'Некорректные данные'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const { token, password } = parsed.data

  const parts = token.split('.')
  if (parts.length !== 2) {
    return NextResponse.json({ error: 'Недействительная ссылка' }, { status: 400 })
  }
  const [recordId, secret] = parts

  const record = await prisma.setInitialPasswordToken.findUnique({
    where: { id: recordId },
    include: { user: true },
  })
  if (!record || record.usedAt) {
    return NextResponse.json({ error: 'Ссылка недействительна или уже использована' }, { status: 400 })
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Срок действия ссылки истёк.' }, { status: 400 })
  }
  if (!record.codeVerifiedAt) {
    return NextResponse.json({ error: 'Сначала введите код из письма.' }, { status: 400 })
  }

  const valid = await verifyTokenHash(secret, record.tokenHash)
  if (!valid) {
    return NextResponse.json({ error: 'Недействительная ссылка' }, { status: 400 })
  }

  const hashedPassword = await hashPassword(password)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword, mustChangePassword: false },
    }),
    prisma.setInitialPasswordToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ])

  return NextResponse.json({ message: 'Пароль успешно установлен. Войдите с новым паролем.' })
}
