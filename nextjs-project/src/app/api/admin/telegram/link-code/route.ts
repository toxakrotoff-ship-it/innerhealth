import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { randomBytes } from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CODE_BYTES = 12; // 24 hex chars
const EXPIRES_MINUTES = 10;

function generateCode(): string {
  return randomBytes(CODE_BYTES).toString('hex');
}

/** POST: создать одноразовый код привязки и вернуть ссылку на бота */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = session.user.role as string;
  if (role !== 'ADMIN' && role !== 'WRITER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || typeof token !== 'string') {
    return NextResponse.json(
      { error: 'Telegram bot not configured (TELEGRAM_BOT_TOKEN)' },
      { status: 503 }
    );
  }

  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000);

    await prisma.telegramLinkCode.create({
      data: {
        code,
        userId: session.user.id,
        expiresAt,
      },
    });

    let botUsername: string;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
      if (!data.ok || !data.result?.username) {
        return NextResponse.json(
          { error: 'Could not get bot username from Telegram' },
          { status: 503 }
        );
      }
      botUsername = data.result.username;
    } catch (e) {
      console.error('Telegram getMe error:', e);
      return NextResponse.json(
        { error: 'Could not get bot username' },
        { status: 503 }
      );
    }

    const startUrl = `https://t.me/${botUsername}?start=${code}`;

    return NextResponse.json({
      startUrl,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: EXPIRES_MINUTES,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Telegram link-code error:', message, e);
    return NextResponse.json(
      { error: 'Failed to create link code', details: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    );
  }
}
