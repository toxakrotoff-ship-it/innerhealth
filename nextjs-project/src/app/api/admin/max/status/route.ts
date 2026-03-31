import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as maxService from '@/services/max.service';
import { parseBrandFromSearchParams } from '@/lib/brand/brand-settings';

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const brandId = parseBrandFromSearchParams(new URL(request.url).searchParams) ?? 'inner';
    const whitelist = await maxService.findMaxWhitelistStatusByUserId(session.user.id, { brandId });
    return NextResponse.json({
      linked: !!whitelist,
      linkedAt: whitelist?.linkedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('MAX status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
