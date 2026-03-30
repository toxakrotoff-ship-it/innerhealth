import { NextResponse } from 'next/server';
import { getTelegramBotUserCapabilities } from '@/lib/bot-user-capabilities';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

export async function GET(request: Request) {
  if (!isServiceRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const telegramUserId = url.searchParams.get('telegramUserId')?.trim();
  if (!telegramUserId) {
    return NextResponse.json({ error: 'Missing telegramUserId' }, { status: 400 });
  }

  try {
    return NextResponse.json(await getTelegramBotUserCapabilities(telegramUserId));
  } catch (error) {
    console.error('[telegram/bot-capabilities] failed:', error);
    return NextResponse.json({ error: 'Failed to get bot capabilities' }, { status: 500 });
  }
}
