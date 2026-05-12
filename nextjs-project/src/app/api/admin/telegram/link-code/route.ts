import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireAdminSession } from '@/lib/require-admin';
import * as telegramService from '@/services/telegram.service';
import * as settingsService from '@/services/settings.service';
import { parseBrandFromSearchParams } from '@/lib/brand/brand-settings';
import { telegramApiFetch } from '@/lib/telegram-api-fetch';

const CODE_BYTES = 12; // 24 hex chars
const EXPIRES_MINUTES = 10;

function generateCode(): string {
  return randomBytes(CODE_BYTES).toString('hex');
}

/** POST: создать одноразовый код привязки и вернуть ссылку на бота (ADMIN only). */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const brandId = parseBrandFromSearchParams(new URL(request.url).searchParams) ?? 'inner';
  const token = await settingsService.getTelegramBotToken({ brandId });
  if (!token) {
    return NextResponse.json(
      { error: 'Telegram bot not configured. Задайте токен в настройках или TELEGRAM_BOT_TOKEN.' },
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
    console.error('Telegram link-code error:', message, e);
    return NextResponse.json(
      { error: 'Failed to create link code', details: process.env.NODE_ENV === 'development' ? message : undefined },
      { status: 500 }
    );
  }
}
