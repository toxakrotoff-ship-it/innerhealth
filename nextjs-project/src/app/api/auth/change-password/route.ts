import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hashPassword, verifyPassword, isBcryptHash } from '@/lib/password'
import * as userService from '@/services/user.service'
import { z } from 'zod'

const bodySchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(6, 'Минимум 6 символов').max(128),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Необходимо войти' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.newPassword?.[0] ??
      parsed.error.flatten().fieldErrors.currentPassword?.[0] ??
      'Некорректные данные'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const { currentPassword, newPassword } = parsed.data

  const user = await userService.findUserByIdFor2fa(session.user.id as string)
  if (!user) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
  }

  const valid = isBcryptHash(user.password)
    ? await verifyPassword(currentPassword, user.password)
    : user.password === currentPassword
  if (!valid) {
    return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 })
  }

  const hashedPassword = await hashPassword(newPassword)
  await userService.updateUser(user.id, {
    password: hashedPassword,
    mustChangePassword: false,
  })

  return NextResponse.json({ message: 'Пароль успешно изменён.' })
}
