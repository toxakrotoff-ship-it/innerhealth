import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as maxService from '@/services/max.service';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'PARTNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const whitelist = await maxService.findMaxWhitelistStatusByUserId(session.user.id);
    return NextResponse.json({
      linked: !!whitelist,
      linkedAt: whitelist?.linkedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('MAX status (account) error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
