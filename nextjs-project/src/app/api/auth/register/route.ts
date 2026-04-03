import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { getBaseUrlForEmails, sendEmailVerificationLinkEmail } from '@/lib/email'
import { hashPassword } from '@/lib/password'
import { validatePublicEmailDomain } from '@/lib/security/public-email-domain'
import { registerBodySchema } from '@/lib/validations/account'
import { issueEmailVerificationToken } from '@/services/email-verification.service'
import * as userService from '@/services/user.service'

const REGISTER_RATE_LIMIT = 5

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'auth-register', REGISTER_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.resetIn),
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  let payload: z.infer<typeof registerBodySchema>
  try {
    payload = registerBodySchema.parse(await request.json())
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

  const emailValidation = await validatePublicEmailDomain(payload.email)
  if (!emailValidation.valid) {
    return NextResponse.json(
      { error: emailValidation.userMessage || 'Registration is not allowed for this email domain.' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const existingUser = await userService.findUserByEmail(payload.email)
  if (existingUser) {
    return NextResponse.json(
      { error: 'Email is already in use' },
      {
        status: 409,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const passwordHash = await hashPassword(payload.password)
  const createdUser = await userService.createUser({
    email: payload.email,
    password: passwordHash,
    name: payload.name ?? null,
    lastName: payload.lastName ?? null,
    phone: payload.phone ?? null,
    role: 'USER',
    mustChangePassword: false,
  })

  try {
    const verification = await issueEmailVerificationToken(createdUser.id)
    const baseUrl = getBaseUrlForEmails(request)
    const verificationLink =
      `${baseUrl}/account/verify-email?token=${encodeURIComponent(verification.token)}`
    const emailResult = await sendEmailVerificationLinkEmail(verification.email, verificationLink)

    if (!emailResult.ok) {
      return NextResponse.json(
        { error: emailResult.error ?? 'Failed to send verification email' },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }
  } catch (error) {
    console.error('[auth/register] Failed to generate verification token:', error)
    return NextResponse.json(
      { error: 'Failed to create verification flow' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      userId: createdUser.id,
      email: createdUser.email,
      isEmailVerified: false,
      nextStep: 'verify_email',
    },
    {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
