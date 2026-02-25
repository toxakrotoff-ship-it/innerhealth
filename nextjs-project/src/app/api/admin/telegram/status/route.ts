import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as telegramService from '@/services/telegram.service';

/** GET: статус привязки Telegram для текущего админа (ADMIN only). */
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const whitelist = await telegramService.findTelegramWhitelistStatusByUserId(session.user.id);
    return NextResponse.json({
      linked: !!whitelist,
      linkedAt: whitelist?.linkedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error('Telegram status error:', e);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
