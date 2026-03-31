import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Bot } from '@maxhub/max-bot-api';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '@/lib/require-admin';
import * as maxService from '@/services/max.service';
import * as settingsService from '@/services/settings.service';
import { parseBrandFromSearchParams } from '@/lib/brand/brand-settings';

const CODE_BYTES = 12;
const EXPIRES_MINUTES = 10;

function generateCode(): string {
  return randomBytes(CODE_BYTES).toString('hex');
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const brandId = parseBrandFromSearchParams(new URL(request.url).searchParams) ?? 'inner';
  const settings = await settingsService.getMaxBotSettings({ brandId });
  if (!settings.token) {
    return NextResponse.json(
      { error: 'MAX bot not configured. Укажите токен в настройках.' },
      { status: 503 }
    );
  }

  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000);
    await maxService.createMaxLinkCode({ code, userId: session.user.id, expiresAt, brandId });
    let botName = '';
    try {
      const bot = new Bot(settings.token);
      const me = await bot.api.getMyInfo();
      botName = String((me as { username?: string }).username || '').trim();
    } catch (error) {
      console.error('MAX getMyInfo error:', error);
    }
    if (!botName) {
      return NextResponse.json(
        { error: 'Could not get bot username from MAX' },
        { status: 503 }
      );
    }
    return NextResponse.json({
      startUrl: `https://max.ru/${botName}?start=${code}`,
      code,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: EXPIRES_MINUTES,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('MAX link-code error:', message, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json(
        {
          error:
            'Таблица привязки MAX отсутствует в БД. Примените миграции Prisma (MaxLinkCode / MaxWhitelist).',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to create link code',
        ...(process.env.NODE_ENV === 'development' ? { details: message } : {}),
      },
      { status: 500 }
    );
  }
}
