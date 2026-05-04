import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as partnerService from '@/services/partner.service';
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  const { userId } = await params;

  const isPartner = await partnerService.ensureUserIsPartner(userId);
  if (!isPartner) {
    return NextResponse.json(
      { error: 'User is not a partner' },
      { status: 404 }
    );
  }

  try {
    const stats = await partnerService.getPartnerStatsByUserId(userId, brandId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching partner stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner stats' },
      { status: 500 }
    );
  }
}
