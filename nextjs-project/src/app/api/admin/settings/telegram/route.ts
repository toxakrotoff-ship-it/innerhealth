import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as userService from '@/services/user.service';
import * as telegramService from '@/services/telegram.service';
import { z } from 'zod';
import { parseBrandFromSearchParams } from '@/lib/brand/brand-settings';

/** GET: список привязок Telegram по администраторам (роль ADMIN). Только для ADMIN. */
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const brandId = parseBrandFromSearchParams(new URL(request.url).searchParams) ?? 'inner';
    const admins = await userService.getAdminsWithTelegramWhitelist(brandId);
    const list = admins.map((u) => ({
      id: u.id,
      email: u.email,
      name: [u.name, u.lastName].filter(Boolean).join(' ') || u.email,
      telegramUserId: u.telegramWhitelist[0]?.telegramUserId ?? null,
      linkedAt: u.telegramWhitelist[0]?.linkedAt?.toISOString() ?? null,
      infraAlertsEnabled: u.infraAlertsEnabled ?? false,
    }));
    return NextResponse.json(list);
  } catch (e) {
    console.error('Settings telegram GET error:', e);
    return NextResponse.json(
      { error: 'Не удалось загрузить привязки Telegram' },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  userId: z.string().min(1),
  infraAlertsEnabled: z.boolean(),
});

/** PATCH: включить/выключить тех. алерты для администратора. Только для ADMIN. */
export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  }

  try {
    const result = await userService.updateAdminInfraAlertsEnabled({
      userId: parsed.data.userId,
      infraAlertsEnabled: parsed.data.infraAlertsEnabled,
    });
    if (!result.updated) {
      return NextResponse.json({ error: 'Пользователь не найден или не администратор' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Settings telegram PATCH error:', e);
    return NextResponse.json({ error: 'Не удалось сохранить настройку' }, { status: 500 });
  }
}

/** DELETE: отвязать Telegram у пользователя (userId в query). Только для ADMIN. */
export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const brandId = parseBrandFromSearchParams(searchParams) ?? 'inner';
  const userId = searchParams.get('userId')?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId обязателен' }, { status: 400 });
  }

  try {
    const user = await userService.findAdminById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден или не администратор' }, { status: 404 });
    }
    await telegramService.deleteTelegramWhitelistByUserId(userId, { brandId });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Settings telegram DELETE error:', e);
    return NextResponse.json(
      { error: 'Не удалось отвязать Telegram' },
      { status: 500 }
    );
  }
}
