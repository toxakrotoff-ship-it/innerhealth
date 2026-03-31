import { NextResponse } from 'next/server';
import * as promoService from '@/services/promo.service';
import { normalizeBrandId } from '@/lib/brand/brand';

const SERVICE_HEADER = 'x-service-key';
function isServiceRequest(request: Request): boolean {
  const key = request.headers.get(SERVICE_HEADER);
  if (!key) return false;
  const telegramSecret = process.env.TELEGRAM_SERVICE_SECRET;
  const maxSecret = process.env.MAX_SERVICE_SECRET;
  return (typeof telegramSecret === 'string' && key === telegramSecret) ||
    (typeof maxSecret === 'string' && key === maxSecret);
}

/** GET: статистика промокодов для бота (X-Service-Key). */
export async function GET(request: Request) {
  if (!isServiceRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const brandId = normalizeBrandId(new URL(request.url).searchParams.get('brand'));
    const promos = await promoService.getPromoCodesForAdmin(brandId);
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
