import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as telegramService from '@/services/telegram.service';
import * as settingsService from '@/services/settings.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';
import { telegramApiFetch } from '@/lib/telegram-api-fetch';

const CODE_BYTES = 12;
const EXPIRES_MINUTES = 10;

function generateCode(): string {
  return randomBytes(CODE_BYTES).toString('hex');
}

/** POST: создать одноразовый код привязки и вернуть ссылку на бота (auth user). */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brandId = resolveBrandOrDefaultFromRequest(request);
  const token = await settingsService.getTelegramBotToken({ brandId });
  if (!token) {
    return NextResponse.json(
      { error: 'Telegram bot not configured. Обратитесь к администратору.' },
      { status: 503 }
    );
  }

  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000);

    await telegramService.createTelegramLinkCode({
      code,
      userId: session.user.id,
      expiresAt,
      brandId,
    });

    let botUsername: string;
    try {
      const res = await telegramApiFetch(`https://api.telegram.org/bot${token}/getMe`);
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
    console.error('Telegram link-code (account) error:', message, e);
    return NextResponse.json(
      { error: 'Failed to create link code', details: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    );
  }
}
