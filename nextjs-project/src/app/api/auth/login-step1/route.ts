import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword, isBcryptHash } from '@/lib/password'
import { createPendingToken, buildPendingCookieValue } from '@/lib/two-factor'
import { send2FACodeEmail } from '@/lib/email'
import { generateSixDigitCode, hashCode } from '@/lib/set-initial-password'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const PENDING_EXPIRES_MINUTES = 10
const EMAIL_CODE_EXPIRES_MINUTES = 5

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>
  try {
    const raw = await request.json()
    body = bodySchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const email = body.email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = isBcryptHash(user.password)
    ? await verifyPassword(body.password, user.password)
    : user.password === body.password

  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (!user.twoFactorEnabled) {
    return NextResponse.json({ success: true })
  }

  const { hash: tokenHash } = await createPendingToken()
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + PENDING_EXPIRES_MINUTES)

  let emailCodeHash: string | null = null
  let emailCodeExpiresAt: Date | null = null

  if (user.twoFactorMethod === 'email') {
    const code = generateSixDigitCode()
    emailCodeHash = await hashCode(code)
    emailCodeExpiresAt = new Date()
    emailCodeExpiresAt.setMinutes(emailCodeExpiresAt.getMinutes() + EMAIL_CODE_EXPIRES_MINUTES)
    await send2FACodeEmail(user.email, code)
  }

  const pending = await prisma.twoFactorPending.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tokenHash,
      expiresAt,
      emailCodeHash,
      emailCodeExpiresAt,
    },
    update: {
      tokenHash,
      expiresAt,
      emailCodeHash,
      emailCodeExpiresAt,
    },
  })

  const response = NextResponse.json({
    need2FA: true,
    method: user.twoFactorMethod ?? 'email',
  })
  response.headers.append('Set-Cookie', buildPendingCookieValue(pending.id))
  return response
}
