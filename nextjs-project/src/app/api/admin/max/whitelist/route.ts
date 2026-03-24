import { NextResponse } from 'next/server';
import * as maxService from '@/services/max.service';

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

  try {
    const list = await maxService.getMaxWhitelist();
    return NextResponse.json({ maxUserIds: list.map((row) => row.maxUserId) });
  } catch (error) {
    console.error('MAX whitelist error:', error);
    return NextResponse.json({ error: 'Failed to get whitelist' }, { status: 500 });
  }
}
