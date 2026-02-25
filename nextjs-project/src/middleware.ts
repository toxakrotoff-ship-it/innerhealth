import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Применение редиректов из БД (Tilda → наш сайт). Вызов /api/redirect-check возвращает 301 и др. */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  const adminPath = process.env.ADMIN_SECRET_PATH || 'admin';
  if (pathname.startsWith(`/${adminPath}`)) {
    return NextResponse.next();
  }

  const base = request.nextUrl.origin;
  const checkUrl = `${base}/api/redirect-check?path=${encodeURIComponent(pathname)}`;

  try {
    const res = await fetch(checkUrl, { cache: 'no-store' });
    if (res.status !== 200) return NextResponse.next();
    const body = await res.json();
    const destination = body?.destination;
    const statusCode = Number(body?.statusCode);
    if (!destination || typeof destination !== 'string') return NextResponse.next();

    const allowed = [301, 302, 307, 308];
    const code = allowed.includes(statusCode) ? statusCode : 301;
    const target = destination.startsWith('http') ? destination : `${base}${destination.startsWith('/') ? '' : '/'}${destination}`;
    return NextResponse.redirect(target, code);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:ico|png|jpg|jpeg|gif|webp|avif|svg|woff2?)$).*)'],
};
