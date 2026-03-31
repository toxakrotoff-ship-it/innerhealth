import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import * as partnerService from '@/services/partner.service';
import { normalizeBrandId } from '@/lib/brand/brand';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'MAX_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

export async function GET(request: Request) {
  if (!isServiceRequest(request))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const maxUserId = url.searchParams.get('maxUserId')?.trim();
  const brandId = normalizeBrandId(url.searchParams.get('brand'));
  if (!maxUserId)
    return NextResponse.json({ error: 'Missing maxUserId' }, { status: 400 });

  try {
    const whitelist = await prisma.maxWhitelist.findUnique({
      where: {
        brand_maxUserId: {
          brand: brandId ?? 'inner',
          maxUserId,
        },
      },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!whitelist || whitelist.user.role !== Role.PARTNER)
      return NextResponse.json({ error: 'Not a partner or MAX not linked' }, { status: 403 });

    const stats = await partnerService.getPartnerStatsForPartner(whitelist.user.id, brandId);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('MAX partner-stats error:', error);
    return NextResponse.json({ error: 'Failed to get partner stats' }, { status: 500 });
  }
}
