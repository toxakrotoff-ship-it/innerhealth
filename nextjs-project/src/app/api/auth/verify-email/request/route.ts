import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { getEmailRiskVerdict } from '@/lib/security/email-risk'
import { getBaseUrlForEmails, sendEmailVerificationLinkEmail } from '@/lib/email'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { verifyEmailRequestBodySchema } from '@/lib/validations/account'
import {
  EMAIL_VERIFICATION_ERROR_CODES,
  type EmailVerificationServiceError,
  issueEmailVerificationToken,
} from '@/services/email-verification.service'
import * as userService from '@/services/user.service'

const VERIFY_EMAIL_REQUEST_RATE_LIMIT = 5

function isEmailVerificationServiceError(error: unknown): error is EmailVerificationServiceError {
  if (!error || typeof error !== 'object') return false
  return 'code' in error
}

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'verify-email-request', VERIFY_EMAIL_REQUEST_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many verification requests. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.resetIn),
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  let payload: z.infer<typeof verifyEmailRequestBodySchema>
  try {
    payload = verifyEmailRequestBodySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join('; ') : 'Invalid payload'
    return NextResponse.json(
      { error: message },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  if (payload.email && getEmailRiskVerdict(payload.email) === 'block') {
    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const session = await getServerSession(authOptions)

  let targetUser: Awaited<ReturnType<typeof userService.findUserByEmailForEmailVerification>> | null = null
  if (session?.user?.id && session.user.role === 'USER') {
    targetUser = await userService.findUserByIdForEmailVerification(session.user.id)
  } else if (payload.email) {
    targetUser = await userService.findUserByEmailForEmailVerification(payload.email)
  }

  if (!targetUser || targetUser.role !== 'USER' || targetUser.emailVerifiedAt) {
    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  try {
    const verification = await issueEmailVerificationToken(targetUser.id)
    const baseUrl = getBaseUrlForEmails(request)
    const verificationLink =
      `${baseUrl}/account/verify-email?token=${encodeURIComponent(verification.token)}`
    await sendEmailVerificationLinkEmail(verification.email, verificationLink)
    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    if (
      isEmailVerificationServiceError(error) &&
      error.code === EMAIL_VERIFICATION_ERROR_CODES.alreadyVerified
    ) {
      return NextResponse.json(
        { ok: true },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    console.error('[auth/verify-email/request] Failed to request verification:', error)
    return NextResponse.json(
      { error: 'Failed to request email verification' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
