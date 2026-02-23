import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** GET: список привязок Telegram по администраторам (роль ADMIN). Только для ADMIN. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        telegramWhitelist: {
          select: { telegramUserId: true, linkedAt: true },
        },
      },
      orderBy: { email: 'asc' },
    });
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId')?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'userId обязателен' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, role: 'ADMIN' },
    });
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден или не администратор' }, { status: 404 });
    }
    await prisma.telegramWhitelist.deleteMany({
      where: { userId },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Settings telegram DELETE error:', e);
    return NextResponse.json(
      { error: 'Не удалось отвязать Telegram' },
      { status: 500 }
    );
  }
}
