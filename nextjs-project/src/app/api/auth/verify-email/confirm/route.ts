import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { verifyEmailConfirmBodySchema } from '@/lib/validations/account'
import {
  EMAIL_VERIFICATION_ERROR_CODES,
  type EmailVerificationServiceError,
  confirmEmailVerificationToken,
} from '@/services/email-verification.service'

const VERIFY_EMAIL_CONFIRM_RATE_LIMIT = 10

function isEmailVerificationServiceError(error: unknown): error is EmailVerificationServiceError {
  if (!error || typeof error !== 'object') return false
  return 'code' in error
}

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = checkRateLimit(clientId, 'verify-email-confirm', VERIFY_EMAIL_CONFIRM_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many verification attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  let payload: z.infer<typeof verifyEmailConfirmBodySchema>
  try {
    payload = verifyEmailConfirmBodySchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join('; ') : 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    await confirmEmailVerificationToken(payload.token)
    return NextResponse.json({ ok: true, isEmailVerified: true })
  } catch (error) {
    if (isEmailVerificationServiceError(error)) {
      if (error.code === EMAIL_VERIFICATION_ERROR_CODES.alreadyVerified) {
        return NextResponse.json({ ok: true, isEmailVerified: true })
      }

      if (
        error.code === EMAIL_VERIFICATION_ERROR_CODES.invalidToken ||
        error.code === EMAIL_VERIFICATION_ERROR_CODES.expiredToken ||
        error.code === EMAIL_VERIFICATION_ERROR_CODES.usedToken
      ) {
        return NextResponse.json({ error: 'Verification token is invalid or expired' }, { status: 400 })
      }
    }

    console.error('[auth/verify-email/confirm] Failed to confirm verification:', error)
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
  }
}
