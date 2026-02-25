import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyPassword, isBcryptHash } from '@/lib/password'
import { createPendingToken, buildPendingCookieValue } from '@/lib/two-factor'
import { send2FACodeEmail } from '@/lib/email'
import { generateSixDigitCode, hashCode } from '@/lib/set-initial-password'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import * as userService from '@/services/user.service'
import * as auth2faService from '@/services/auth-2fa.service'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const PENDING_EXPIRES_MINUTES = 10
const EMAIL_CODE_EXPIRES_MINUTES = 5
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = checkRateLimit(clientId, 'login-step1', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  let body: z.infer<typeof bodySchema>
  try {
    const raw = await request.json()
    body = bodySchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = body.email.trim().toLowerCase()
  const user = await userService.findUserByEmail(email)
  const userFor2fa = user
    ? {
        id: user.id,
        email: user.email,
        password: user.password,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
      }
    : null

  if (!userFor2fa) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = isBcryptHash(userFor2fa.password)
    ? await verifyPassword(body.password, userFor2fa.password)
    : userFor2fa.password === body.password

  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (!userFor2fa.twoFactorEnabled) {
    return NextResponse.json({ success: true })
  }

  const { hash: tokenHash } = await createPendingToken()
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + PENDING_EXPIRES_MINUTES)

  let emailCodeHash: string | null = null
  let emailCodeExpiresAt: Date | null = null

  if (userFor2fa.twoFactorMethod === 'email') {
    const code = generateSixDigitCode()
    emailCodeHash = await hashCode(code)
    emailCodeExpiresAt = new Date()
    emailCodeExpiresAt.setMinutes(emailCodeExpiresAt.getMinutes() + EMAIL_CODE_EXPIRES_MINUTES)
    await send2FACodeEmail(userFor2fa.email, code)
  }

  const pending = await auth2faService.upsertTwoFactorPending({
    userId: userFor2fa.id,
    tokenHash,
    expiresAt,
    emailCodeHash,
    emailCodeExpiresAt,
  })

  const response = NextResponse.json({
    need2FA: true,
    method: userFor2fa.twoFactorMethod ?? 'email',
  })
  response.headers.append('Set-Cookie', buildPendingCookieValue(pending.id))
  return response
}
