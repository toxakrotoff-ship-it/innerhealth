import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as userService from '@/services/user.service';

const patchAdminSchema = z.object({
  userId: z.string().min(1, 'userId обязателен'),
  notificationEmail: z.string().trim().transform((s) => s || null).nullable().optional(),
});

/** GET: список администраторов (роль ADMIN) с полями email, notificationEmail. Только для ADMIN. */
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const admins = await userService.getAdminsForSettingsList();
    const list = admins.map((u) => ({
      id: u.id,
      email: u.email,
      name: [u.name, u.lastName].filter(Boolean).join(' ') || u.email,
      notificationEmail: u.notificationEmail?.trim() || null,
    }));
    return NextResponse.json(list);
  } catch (e) {
    console.error('Settings admins GET error:', e);
    return NextResponse.json(
      { error: 'Не удалось загрузить список администраторов' },
      { status: 500 }
    );
  }
}

/** PATCH: установить или снять привязанный ящик для администратора. Только для ADMIN. */
export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  let body: z.infer<typeof patchAdminSchema>;
  try {
    const raw = await request.json();
    body = patchAdminSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { userId, notificationEmail } = body;

  try {
    const user = await userService.findAdminById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден или не администратор' }, { status: 404 });
    }
    await userService.updateUser(userId, { notificationEmail });
    const updated = await userService.findUserProfile(userId);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      name: [updated.name, updated.lastName].filter(Boolean).join(' ') || updated.email,
      notificationEmail: updated.notificationEmail?.trim() || null,
    });
  } catch (e) {
    console.error('Settings admins PATCH error:', e);
    return NextResponse.json(
      { error: 'Не удалось обновить привязку ящика' },
      { status: 500 }
    );
  }
}
