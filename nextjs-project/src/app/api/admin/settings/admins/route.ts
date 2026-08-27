import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as userService from '@/services/user.service';
import { parseBrandFromSearchParams } from '@/lib/brand/brand-settings';

const patchAdminSchema = z.object({
  userId: z.string().min(1, 'userId обязателен'),
  notificationEmail: z.string().trim().transform((s) => s || null).nullable().optional(),
});

/** GET: список администраторов (роль ADMIN) с полями email, notificationEmail для текущего бренда. Только для ADMIN. */
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const brandId = parseBrandFromSearchParams(new URL(request.url).searchParams) ?? 'inner';
    const admins = await userService.getAdminsForSettingsList(brandId);
    const list = admins.map((u) => ({
      id: u.id,
      email: u.email,
      name: [u.name, u.lastName].filter(Boolean).join(' ') || u.email,
      notificationEmail: u.notificationEmails[0]?.email?.trim() || null,
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

/** PATCH: установить или снять привязанный ящик для администратора в рамках текущего бренда. Только для ADMIN. */
export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const brandId = parseBrandFromSearchParams(new URL(request.url).searchParams) ?? 'inner';

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
    await userService.upsertAdminNotificationEmail({ userId, brandId, email: notificationEmail ?? null });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: [user.name, user.lastName].filter(Boolean).join(' ') || user.email,
      notificationEmail: notificationEmail?.trim() || null,
    });
  } catch (e) {
    console.error('Settings admins PATCH error:', e);
    return NextResponse.json(
      { error: 'Не удалось обновить привязку ящика' },
      { status: 500 }
    );
  }
}
