import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPendingIdFromCookie,
  createGrant,
  clearPendingCookieHeader,
} from '@/lib/two-factor'
import { verifyTotpCode } from '@/lib/totp'
import { verifyCodeHash } from '@/lib/set-initial-password'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import * as auth2faService from '@/services/auth-2fa.service'

const bodySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/),
})

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = checkRateLimit(clientId, 'verify-2fa', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  const cookieHeader = request.headers.get('cookie')
  const pendingId = getPendingIdFromCookie(cookieHeader)

  if (!pendingId) {
    return NextResponse.json({ error: 'Invalid or missing 2FA session' }, { status: 401 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    const raw = await request.json()
    body = bodySchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  const pending = await auth2faService.findTwoFactorPendingWithUser(pendingId)

  if (!pending || pending.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Invalid or expired 2FA session' }, { status: 401 })
  }

  const { user } = pending
  let valid: boolean

  if (user.twoFactorMethod === 'email') {
    if (!pending.emailCodeHash || !pending.emailCodeExpiresAt || pending.emailCodeExpiresAt <= new Date()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 401 })
    }
    valid = await verifyCodeHash(body.code, pending.emailCodeHash)
  } else if (user.twoFactorMethod === 'totp' && user.totpSecretEncrypted) {
    valid = await verifyTotpCode(user.totpSecretEncrypted, body.code)
  } else {
    return NextResponse.json({ error: 'Invalid 2FA method' }, { status: 400 })
  }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  const { grantId } = await createGrant(user.id)

  await auth2faService.deleteTwoFactorPending(pendingId)

  const response = NextResponse.json({ grantToken: grantId })
  response.headers.append('Set-Cookie', clearPendingCookieHeader())
  return response
}
