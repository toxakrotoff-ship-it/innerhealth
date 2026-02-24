import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  getPendingIdFromCookie,
  createGrant,
  clearPendingCookieHeader,
} from '@/lib/two-factor'
import { verifyTotpCode } from '@/lib/totp'
import { verifyCodeHash } from '@/lib/set-initial-password'

const bodySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/),
})

export async function POST(request: Request) {
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

  const pending = await prisma.twoFactorPending.findUnique({
    where: { id: pendingId },
    include: {
      user: {
        select: {
          id: true,
          twoFactorMethod: true,
          totpSecretEncrypted: true,
        },
      },
    },
  })

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

  await prisma.twoFactorPending.delete({
    where: { id: pendingId },
  }).catch(() => {})

  const response = NextResponse.json({ grantToken: grantId })
  response.headers.append('Set-Cookie', clearPendingCookieHeader())
  return response
}
