import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyPassword, isBcryptHash } from '@/lib/password'
import {
  generateTotpSecret,
  encryptTotpSecret,
  verifyTotpCode,
  getTotpUri,
} from '@/lib/totp'

const bodySchema = z.object({
  action: z.enum(['enable', 'disable']),
  method: z.enum(['email', 'totp']).optional(),
  code: z.string().optional(),
  password: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { twoFactorEnabled: true, twoFactorMethod: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json({
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorMethod: user.twoFactorMethod,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    const raw = await request.json()
    body = bodySchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const userId = session.user.id as string
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      password: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      totpSecretEncrypted: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (body.action === 'disable') {
    const verified =
      (body.password &&
        (isBcryptHash(user.password)
          ? await verifyPassword(body.password, user.password)
          : user.password === body.password)) ||
      (body.code &&
        user.twoFactorMethod === 'totp' &&
        user.totpSecretEncrypted &&
        (await verifyTotpCode(user.totpSecretEncrypted, body.code)))

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid password or code' },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        totpSecretEncrypted: null,
      },
    })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'enable') {
    if (!body.method) {
      return NextResponse.json(
        { error: 'method is required for enable' },
        { status: 400 }
      )
    }

    if (body.method === 'email') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: 'email',
          totpSecretEncrypted: null,
        },
      })
      return NextResponse.json({ ok: true })
    }

    if (body.method === 'totp') {
      if (!body.code) {
        const secret = generateTotpSecret()
        const encrypted = encryptTotpSecret(secret)
        await prisma.user.update({
          where: { id: userId },
          data: {
            twoFactorMethod: 'totp',
            totpSecretEncrypted: encrypted,
            twoFactorEnabled: false,
          },
        })
        const uri = getTotpUri(secret, user.email, 'Inner Health')
        return NextResponse.json({ uri })
      }

      if (!user.totpSecretEncrypted) {
        return NextResponse.json(
          { error: 'Start TOTP setup first (request without code)' },
          { status: 400 }
        )
      }
      const valid = await verifyTotpCode(user.totpSecretEncrypted, body.code)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
      }
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      })
      return NextResponse.json({ ok: true })
    }
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 })
}
