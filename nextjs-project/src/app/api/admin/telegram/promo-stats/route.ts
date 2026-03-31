import { NextResponse } from 'next/server';
import { getPromoStatsForAdmin } from '@/bot/runtime/promo-stats';
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
    const promos = await getPromoStatsForAdmin(brandId);
    return NextResponse.json({
      promos,
    });
  } catch (e) {
    console.error('Telegram promo-stats error:', e);
    return NextResponse.json({ error: 'Failed to get promo stats' }, { status: 500 });
  }
}
