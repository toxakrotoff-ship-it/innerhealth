import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import * as partnerService from '@/services/partner.service';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

/**
 * GET /api/telegram/partner-stats?telegramUserId=...
 * For bot: returns partner stats for the user linked to this telegramUserId (PARTNER only). X-Service-Key required.
 */
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
    const whitelist = await prisma.telegramWhitelist.findUnique({
      where: { telegramUserId },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!whitelist || whitelist.user.role !== Role.PARTNER) {
      return NextResponse.json(
        { error: 'Not a partner or Telegram not linked' },
        { status: 403 }
      );
    }

    const stats = await partnerService.getPartnerStatsForPartner(whitelist.user.id);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error('Telegram partner-stats error:', e);
    return NextResponse.json({ error: 'Failed to get partner stats' }, { status: 500 });
  }
}
