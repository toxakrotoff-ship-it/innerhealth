import { NextResponse } from 'next/server';
import { findRedirectByPath } from '@/services/redirect.service';

/**
 * Публичный endpoint для middleware: по path возвращает destination и statusCode (301 и др.).
 * Вызывается только из middleware для применения редиректов из БД.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  if (!path || path === '') {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }
  try {
    const rule = await findRedirectByPath(path);
    if (!rule) {
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json({
      destination: rule.destination,
      statusCode: rule.statusCode,
    });
  } catch (e) {
    console.error('redirect-check error:', e);
    return NextResponse.json(null, { status: 404 });
  }
}
