import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as telegramService from '@/services/telegram.service';
import { parseBrandFromSearchParams } from '@/lib/brand/brand-settings';

/** GET: статус привязки Telegram для текущего админа (ADMIN only). */
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const brandId = parseBrandFromSearchParams(new URL(request.url).searchParams) ?? 'inner';
    const whitelist = await telegramService.findTelegramWhitelistStatusByUserId(session.user.id, { brandId });
    return NextResponse.json({
      linked: !!whitelist,
      linkedAt: whitelist?.linkedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error('Telegram status error:', e);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
