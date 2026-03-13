import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { verifyPassword, isBcryptHash } from '@/lib/password'
import * as userService from '@/services/user.service'
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
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
  const user2fa = await userService.findUserByIdFor2fa(session.user.id as string)
  if (!user2fa) {
    return NextResponse.json(
      { error: 'User not found' },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
  return NextResponse.json(
    {
      twoFactorEnabled: user2fa.twoFactorEnabled,
      twoFactorMethod: user2fa.twoFactorMethod,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  let body: z.infer<typeof bodySchema>
  try {
    const raw = await request.json()
    body = bodySchema.parse(raw)
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  const userId = session.user.id as string
  const user = await userService.findUserByIdFor2fa(userId)

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
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
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    await userService.updateUser(userId, {
      twoFactorEnabled: false,
      twoFactorMethod: null,
      totpSecretEncrypted: null,
    })
    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  if (body.action === 'enable') {
    if (!body.method) {
      return NextResponse.json(
        { error: 'method is required for enable' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    if (body.method === 'email') {
      await userService.updateUser(userId, {
        twoFactorEnabled: true,
        twoFactorMethod: 'email',
        totpSecretEncrypted: null,
      })
      return NextResponse.json(
        { ok: true },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    if (body.method === 'totp') {
      if (!body.code) {
        const secret = generateTotpSecret()
        const encrypted = encryptTotpSecret(secret)
        await userService.updateUser(userId, {
          twoFactorMethod: 'totp',
          totpSecretEncrypted: encrypted,
          twoFactorEnabled: false,
        })
        const uri = getTotpUri(secret, user.email, 'Inner Health')
        return NextResponse.json(
          { uri },
          {
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        )
      }

      if (!user.totpSecretEncrypted) {
        return NextResponse.json(
          { error: 'Start TOTP setup first (request without code)' },
          {
            status: 400,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        )
      }
      const valid = await verifyTotpCode(user.totpSecretEncrypted, body.code)
      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid code' },
          {
            status: 401,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        )
      }
      await userService.updateUser(userId, { twoFactorEnabled: true })
      return NextResponse.json(
        { ok: true },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }
  }

  return NextResponse.json(
    { error: 'Bad request' },
    {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
