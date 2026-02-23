import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** GET: статус привязки Telegram для текущего админа */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = session.user.role as string;
  if (role !== 'ADMIN' && role !== 'WRITER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const whitelist = await prisma.telegramWhitelist.findUnique({
      where: { userId: session.user.id },
      select: { telegramUserId: true, linkedAt: true },
    });
    return NextResponse.json({
      linked: !!whitelist,
      linkedAt: whitelist?.linkedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error('Telegram status error:', e);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
