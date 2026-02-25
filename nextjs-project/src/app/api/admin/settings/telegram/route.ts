import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as userService from '@/services/user.service';
import * as telegramService from '@/services/telegram.service';

/** GET: список привязок Telegram по администраторам (роль ADMIN). Только для ADMIN. */
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const admins = await userService.getAdminsWithTelegramWhitelist();
    const list = admins.map((u) => ({
      id: u.id,
      email: u.email,
      name: [u.name, u.lastName].filter(Boolean).join(' ') || u.email,
      telegramUserId: u.telegramWhitelist?.telegramUserId ?? null,
      linkedAt: u.telegramWhitelist?.linkedAt?.toISOString() ?? null,
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

/** DELETE: отвязать Telegram у пользователя (userId в query). Только для ADMIN. */
export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId')?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId обязателен' }, { status: 400 });
  }

  try {
    const user = await userService.findAdminById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден или не администратор' }, { status: 404 });
    }
    await telegramService.deleteTelegramWhitelistByUserId(userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Settings telegram DELETE error:', e);
    return NextResponse.json(
      { error: 'Не удалось отвязать Telegram' },
      { status: 500 }
    );
  }
}
