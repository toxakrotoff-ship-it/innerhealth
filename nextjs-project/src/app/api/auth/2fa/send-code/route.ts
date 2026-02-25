import { NextResponse } from 'next/server'
import { getPendingIdFromCookie } from '@/lib/two-factor'
import { send2FACodeEmail } from '@/lib/email'
import { generateSixDigitCode, hashCode } from '@/lib/set-initial-password'
import * as auth2faService from '@/services/auth-2fa.service'

const EMAIL_CODE_EXPIRES_MINUTES = 5
const RESEND_COOLDOWN_MS = 60_000 // 1 min

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie')
  const pendingId = getPendingIdFromCookie(cookieHeader)

  if (!pendingId) {
    return NextResponse.json({ error: 'Invalid or missing 2FA session' }, { status: 401 })
  }

  const pending = await auth2faService.findTwoFactorPendingWithUser(pendingId)

  if (!pending || pending.expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Invalid or expired 2FA session' }, { status: 401 })
  }

  if (pending.user.twoFactorMethod !== 'email') {
    return NextResponse.json(
      { error: 'Send code only available for email 2FA' },
      { status: 400 }
    )
  }

  if (pending.emailCodeExpiresAt) {
    const lastSentAt = pending.emailCodeExpiresAt.getTime() - EMAIL_CODE_EXPIRES_MINUTES * 60 * 1000
    const cooldownUntil = lastSentAt + RESEND_COOLDOWN_MS
    if (Date.now() < cooldownUntil) {
      return NextResponse.json(
        { error: 'Please wait before requesting another code' },
        { status: 429 }
      )
    }
  }

  const code = generateSixDigitCode()
  const emailCodeHash = await hashCode(code)
  const emailCodeExpiresAt = new Date()
  emailCodeExpiresAt.setMinutes(emailCodeExpiresAt.getMinutes() + EMAIL_CODE_EXPIRES_MINUTES)

  await auth2faService.updateTwoFactorPending(pendingId, {
    emailCodeHash,
    emailCodeExpiresAt,
  })

  await send2FACodeEmail(pending.user.email, code)

  return NextResponse.json({ ok: true })
}
