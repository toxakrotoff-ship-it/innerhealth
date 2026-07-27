import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { getBaseUrlForEmails } from '@/lib/email'
import {
  createPasswordResetLink,
  deliverPasswordResetLinkViaMessengers,
} from '@/lib/password-reset-link'
import * as userService from '@/services/user.service'

/**
 * POST /api/admin/users/[id]/password-reset-link
 * Creates a one-time password reset link for support when SMTP is down.
 * Also tries Telegram/MAX delivery if the user has linked bots.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const { id: userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 })
  }

  const profile = await userService.findUserProfile(userId)
  if (!profile) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  }

  try {
    const baseUrl = getBaseUrlForEmails(request)
    const created = await createPasswordResetLink({ userId, baseUrl })
    const deliveredVia = await deliverPasswordResetLinkViaMessengers({
      userId,
      resetLink: created.resetLink,
      expiresInMinutes: created.expiresInMinutes,
    })

    console.info('[admin/password-reset-link] issued', {
      userId,
      email: profile.email,
      byAdminId: session.user.id,
      telegram: deliveredVia.telegram,
      max: deliveredVia.max,
    })

    return NextResponse.json({
      resetLink: created.resetLink,
      expiresInMinutes: created.expiresInMinutes,
      email: profile.email,
      deliveredVia,
    })
  } catch (error) {
    console.error('[admin/password-reset-link] failed', userId, error)
    return NextResponse.json(
      { error: 'Не удалось создать ссылку сброса пароля' },
      { status: 500 }
    )
  }
}
