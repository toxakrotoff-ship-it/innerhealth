import { NextResponse } from 'next/server'
import { verifyTokenHash, verifyCodeHash } from '@/lib/set-initial-password'
import * as authTokensService from '@/services/auth-tokens.service'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

const bodySchema = z.object({
  token: z.string().min(1),
  code: z.string().length(6, 'Код должен содержать 6 цифр').regex(/^\d{6}$/, 'Только цифры'),
})
const RATE_LIMIT = 10

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'verify-initial-code', RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.resetIn),
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.code?.[0] ?? 'Некорректные данные'
    return NextResponse.json(
      { error: msg },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
  const { token, code } = parsed.data

  const parts = token.split('.')
  if (parts.length !== 2) {
    return NextResponse.json(
      { error: 'Недействительная ссылка' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
  const [recordId, secret] = parts

  const record = await authTokensService.findSetInitialPasswordTokenById(recordId)
  if (!record || record.usedAt) {
    return NextResponse.json(
      { error: 'Ссылка недействительна или уже использована' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Срок действия ссылки истёк.' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
  if (!record.emailCodeHash || !record.emailCodeExpiresAt) {
    return NextResponse.json(
      { error: 'Сначала запросите код на почту.' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
  if (record.emailCodeExpiresAt < new Date()) {
    return NextResponse.json(
      { error: 'Срок действия кода истёк. Запросите новый код.' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const validLink = await verifyTokenHash(secret, record.tokenHash)
  if (!validLink) {
    return NextResponse.json(
      { error: 'Недействительная ссылка' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const validCode = await verifyCodeHash(code, record.emailCodeHash)
  if (!validCode) {
    return NextResponse.json(
      { error: 'Неверный код' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  await authTokensService.updateSetInitialPasswordToken(record.id, {
    codeVerifiedAt: new Date(),
  })

  return NextResponse.json(
    { ok: true },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
