import { NextResponse } from 'next/server';
import * as telegramService from '@/services/telegram.service';
import { normalizeBrandId } from '@/lib/brand/brand';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

/** GET: список telegram user id из вайтлиста. Для бота (X-Service-Key). */
export async function GET(request: Request) {
  if (!isServiceRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const brandId = normalizeBrandId(new URL(request.url).searchParams.get('brand'));
    const list = await telegramService.getTelegramWhitelist({ brandId });
    return NextResponse.json({
      telegramUserIds: list.map((r) => r.telegramUserId),
    });
  } catch (e) {
    console.error('Telegram whitelist error:', e);
    return NextResponse.json({ error: 'Failed to get whitelist' }, { status: 500 });
  }
}
