import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyTelegramConnection } from '@/lib/telegram-notify';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

/** POST: подтвердить привязку по коду и telegramUserId. Вызывается ботом с X-Service-Key. */
export async function POST(request: Request) {
  if (!isServiceRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { code?: string; telegramUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const telegramUserId = typeof body.telegramUserId === 'string' ? body.telegramUserId.trim() : '';
  if (!code || !telegramUserId) {
    return NextResponse.json(
      { error: 'Missing code or telegramUserId' },
      { status: 400 }
    );
  }

  try {
    const linkRecord = await prisma.telegramLinkCode.findUnique({
      where: { code },
      select: { userId: true, expiresAt: true },
    });

    if (!linkRecord) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }
    if (new Date() > linkRecord.expiresAt) {
      await prisma.telegramLinkCode.delete({ where: { code } }).catch(() => {});
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.telegramLinkCode.delete({ where: { code } });
      await tx.telegramWhitelist.upsert({
        where: { userId: linkRecord.userId },
        create: {
          userId: linkRecord.userId,
          telegramUserId,
        },
        update: { telegramUserId, linkedAt: new Date() },
      });
    });

    void notifyTelegramConnection({
      userId: linkRecord.userId,
      telegramUserId,
    });

    return NextResponse.json({ success: true, message: 'Вы добавлены в список уведомлений' });
  } catch (e) {
    console.error('Telegram confirm error:', e);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
