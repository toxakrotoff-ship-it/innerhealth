import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as partnerService from '@/services/partner.service';

/**
 * GET /api/account/partner-stats
 * Only for authenticated user with role PARTNER. Returns stats per promo: code, ordersCount, partnerIncome (no totalAmount).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'PARTNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stats = await partnerService.getPartnerStatsForPartner(session.user.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[account/partner-stats] Failed to fetch stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner stats' },
      { status: 500 }
    );
  }
}
