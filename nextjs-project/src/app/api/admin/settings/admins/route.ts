import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** GET: список администраторов (роль ADMIN) с полями email, notificationEmail. Только для ADMIN. */
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
        notificationEmail: true,
      },
      orderBy: { email: 'asc' },
    });
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { userId?: string; notificationEmail?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId) {
    return NextResponse.json({ error: 'userId обязателен' }, { status: 400 });
  }

  const notificationEmail =
    body.notificationEmail === null || body.notificationEmail === undefined
      ? null
      : typeof body.notificationEmail === 'string'
        ? body.notificationEmail.trim() || null
        : null;

  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, role: 'ADMIN' },
    });
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден или не администратор' }, { status: 404 });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { notificationEmail },
    });
    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, lastName: true, notificationEmail: true },
    });
    return NextResponse.json({
      id: updated!.id,
      email: updated!.email,
      name: [updated!.name, updated!.lastName].filter(Boolean).join(' ') || updated!.email,
      notificationEmail: updated!.notificationEmail?.trim() || null,
    });
  } catch (e) {
    console.error('Settings admins PATCH error:', e);
    return NextResponse.json(
      { error: 'Не удалось обновить привязку ящика' },
      { status: 500 }
    );
  }
}
