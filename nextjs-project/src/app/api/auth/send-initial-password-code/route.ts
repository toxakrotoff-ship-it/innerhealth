import { NextResponse } from 'next/server'
import { verifyTokenHash } from '@/lib/set-initial-password'
import * as authTokensService from '@/services/auth-tokens.service'
import {
  generateSixDigitCode,
  hashCode,
  getCodeExpiresAt,
} from '@/lib/set-initial-password'
import { sendInitialPasswordCodeEmail } from '@/lib/email'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

const bodySchema = z.object({ token: z.string().min(1) })
const RATE_LIMIT = 5

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'send-initial-code', RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Укажите токен' }, { status: 400 })
  }
  const { token } = parsed.data

  const parts = token.split('.')
  if (parts.length !== 2) {
    return NextResponse.json({ error: 'Недействительная ссылка' }, { status: 400 })
  }
  const [recordId, secret] = parts

  const record = await authTokensService.findSetInitialPasswordTokenById(recordId)
  if (!record || record.usedAt) {
    return NextResponse.json({ error: 'Ссылка недействительна или уже использована' }, { status: 400 })
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Срок действия ссылки истёк.' }, { status: 400 })
  }

  const valid = await verifyTokenHash(secret, record.tokenHash)
  if (!valid) {
    return NextResponse.json({ error: 'Недействительная ссылка' }, { status: 400 })
  }

  const now = new Date()
  if (record.emailCodeHash && record.emailCodeExpiresAt && record.emailCodeExpiresAt > now) {
    return NextResponse.json(
      { error: 'Код уже отправлен на почту. Проверьте письмо или запросите новый код после истечения текущего.' },
      { status: 400 }
    )
  }

  const code = generateSixDigitCode()
  const emailCodeHash = await hashCode(code)
  const emailCodeExpiresAt = getCodeExpiresAt()
  await authTokensService.updateSetInitialPasswordToken(record.id, {
    emailCodeHash,
    emailCodeExpiresAt,
  })

  const sendResult = await sendInitialPasswordCodeEmail(record.user.email, code)
  if (!sendResult.ok) {
    return NextResponse.json(
      { error: sendResult.error ?? 'Не удалось отправить код на почту.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
