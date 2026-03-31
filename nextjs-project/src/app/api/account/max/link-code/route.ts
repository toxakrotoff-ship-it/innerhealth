import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Bot } from '@maxhub/max-bot-api';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as maxService from '@/services/max.service';
import * as settingsService from '@/services/settings.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';

const CODE_BYTES = 12;
const EXPIRES_MINUTES = 10;

function generateCode(): string {
  return randomBytes(CODE_BYTES).toString('hex');
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const brandId = resolveBrandOrDefaultFromRequest(request);
  const settings = await settingsService.getMaxBotSettings({ brandId });
  if (!settings.token) {
    return NextResponse.json(
      { error: 'MAX bot not configured. Обратитесь к администратору.' },
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
    console.error('MAX link-code (account) error:', message, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json(
        {
          error:
            'Таблица привязки MAX отсутствует в БД. Обратитесь к администратору (миграции Prisma).',
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
