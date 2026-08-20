import { NextResponse } from 'next/server'
import { sendPasswordResetEmail, getBaseUrlForEmails } from '@/lib/email'
import * as userService from '@/services/user.service'
import * as authTokensService from '@/services/auth-tokens.service'
import {
  createPasswordResetLink,
  deliverPasswordResetLinkViaMessengers,
  wasPasswordResetDeliveredViaMessenger,
} from '@/lib/password-reset-link'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

const bodySchema = z.object({ email: z.string().email().max(254).trim().toLowerCase() })
const IP_RATE_LIMIT = 3
const IP_RATE_WINDOW_MS = 10 * 60 * 1000
const EMAIL_RATE_LIMIT = 2
const EMAIL_RATE_WINDOW_MS = 30 * 60 * 1000

const GENERIC_SUCCESS_MESSAGE =
  'Если такой email зарегистрирован, на него отправлена ссылка для сброса пароля. Если письма нет — проверьте Telegram/MAX (если аккаунт привязан) или напишите в поддержку.'

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'forgot-password', IP_RATE_LIMIT, IP_RATE_WINDOW_MS)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
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
    return NextResponse.json(
      { error: 'Укажите корректный email' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
  const { email } = parsed.data

  const emailRate = await checkRateLimit(
    email,
    'forgot-password-email',
    EMAIL_RATE_LIMIT,
    EMAIL_RATE_WINDOW_MS
  )
  if (!emailRate.success) {
    return NextResponse.json(
      { message: GENERIC_SUCCESS_MESSAGE },
      {
        headers: {
          'Retry-After': String(emailRate.resetIn),
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const user = await userService.findUserByEmail(email)
  if (!user) {
    return NextResponse.json(
      { message: GENERIC_SUCCESS_MESSAGE },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const baseUrl = getBaseUrlForEmails(request)
  const created = await createPasswordResetLink({ userId: user.id, baseUrl })
  const sendResult = await sendPasswordResetEmail(
    user.email,
    created.resetLink,
    created.expiresInMinutes
  )

  if (sendResult.ok) {
    console.log('[forgot-password] Reset email sent to', user.email)
    return NextResponse.json(
      { message: GENERIC_SUCCESS_MESSAGE },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  console.error('[forgot-password] Email send failed, trying messengers:', sendResult.error)
  const messengerDelivery = await deliverPasswordResetLinkViaMessengers({
    userId: user.id,
    resetLink: created.resetLink,
    expiresInMinutes: created.expiresInMinutes,
  })

  if (wasPasswordResetDeliveredViaMessenger(messengerDelivery)) {
    console.log('[forgot-password] Reset link delivered via messengers', {
      email: user.email,
      ...messengerDelivery,
    })
    return NextResponse.json(
      { message: GENERIC_SUCCESS_MESSAGE },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  await authTokensService.deletePasswordResetToken(created.tokenRecordId)
  return NextResponse.json(
    {
      error:
        'Не удалось отправить ссылку сброса (почта и мессенджеры недоступны). Напишите в поддержку — вам выдадут ссылку вручную.',
    },
    {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
