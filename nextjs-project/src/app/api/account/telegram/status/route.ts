import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as telegramService from '@/services/telegram.service';

/** GET: статус привязки Telegram для текущего пользователя (auth user). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const whitelist = await telegramService.findTelegramWhitelistStatusByUserId(session.user.id);
    return NextResponse.json({
      linked: !!whitelist,
      linkedAt: whitelist?.linkedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error('Telegram status (account) error:', e);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
