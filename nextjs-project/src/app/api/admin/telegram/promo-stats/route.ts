import { NextResponse } from 'next/server';
import * as promoService from '@/services/promo.service';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

/** GET: статистика промокодов для бота (X-Service-Key). */
export async function GET(request: Request) {
  if (!isServiceRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const promos = await promoService.getPromoCodesForAdmin();
    return NextResponse.json({
      promos: promos.map((p) => ({
        code: p.code,
        usedCount: p.usedCount,
        usageLimit: p.usageLimit,
        isActive: p.isActive,
      })),
    });
  } catch (e) {
    console.error('Telegram promo-stats error:', e);
    return NextResponse.json({ error: 'Failed to get promo stats' }, { status: 500 });
  }
}
