import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as userService from '@/services/user.service';
import * as maxService from '@/services/max.service';

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const admins = await userService.getAdminsWithMaxWhitelist();
    const list = admins.map((user) => ({
      id: user.id,
      email: user.email,
      name: [user.name, user.lastName].filter(Boolean).join(' ') || user.email,
      maxUserId: user.maxWhitelist?.maxUserId ?? null,
      linkedAt: user.maxWhitelist?.linkedAt?.toISOString() ?? null,
      infraAlertsEnabled: user.infraAlertsEnabled ?? false,
    }));
    return NextResponse.json(list);
  } catch (error) {
    console.error('Settings MAX GET error:', error);
    return NextResponse.json({ error: 'Не удалось загрузить привязки MAX' }, { status: 500 });
  }
}

const patchSchema = z.object({
  userId: z.string().min(1),
  infraAlertsEnabled: z.boolean(),
});

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });

  try {
    const result = await userService.updateAdminInfraAlertsEnabled(parsed.data);
    if (!result.updated) {
      return NextResponse.json(
        { error: 'Пользователь не найден или не администратор' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings MAX PATCH error:', error);
    return NextResponse.json({ error: 'Не удалось сохранить настройку' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId')?.trim();
  if (!userId)
    return NextResponse.json({ error: 'userId обязателен' }, { status: 400 });

  try {
    const user = await userService.findAdminById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден или не администратор' },
        { status: 404 }
      );
    }
    await maxService.deleteMaxWhitelistByUserId(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings MAX DELETE error:', error);
    return NextResponse.json({ error: 'Не удалось отвязать MAX' }, { status: 500 });
  }
}
