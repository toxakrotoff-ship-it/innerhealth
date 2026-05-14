import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { ADMIN_BRAND_COOKIE_NAME } from '@/lib/brand/brand-context'
import type { BrandId } from '@/lib/brand/brand'

const SERVICE_HEADER = 'x-service-key'
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET'
const BRAND_IDS = new Set(['inner', 'sprint-power'])
const REDIRECT_STATUS_CODES = new Set([301, 302, 307, 308])
const DEFAULT_INNER_SITE_URL = 'https://innerhealth.ru'
const DEFAULT_SPRINT_SITE_URL = 'https://sprint-power.ru'

function getAdminSecretPath(): string {
  return process.env.ADMIN_SECRET_PATH || 'admin'
}

function resolveRedirectBrand(request: Request): BrandId {
  const forwardedBrand = request.headers.get('x-brand')?.trim().toLowerCase()
  if (forwardedBrand === 'sprint-power') return 'sprint-power'

  const host = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    ''
  ).toLowerCase()
  if (host.includes('sprint')) return 'sprint-power'
  return 'inner'
}

function getCanonicalOrigin(brandId: BrandId): string {
  const raw =
    brandId === 'sprint-power'
      ? process.env.NEXT_PUBLIC_SPRINT_POWER_SITE_URL || DEFAULT_SPRINT_SITE_URL
      : process.env.NEXT_PUBLIC_INNER_SITE_URL || DEFAULT_INNER_SITE_URL

  return raw.replace(/\/+$/, '')
}

function getRequestPublicOrigin(request: Request): string | null {
  const host = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    ''
  ).trim()
  if (!host) return null

  const normalizedHost = host.toLowerCase()
  if (
    normalizedHost.startsWith('localhost') ||
    normalizedHost.startsWith('127.0.0.1') ||
    normalizedHost.startsWith('0.0.0.0') ||
    normalizedHost === 'app' ||
    normalizedHost.startsWith('app:')
  ) {
    return null
  }

  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  return `${proto}://${host}`.replace(/\/+$/, '')
}

function createRedirectLocation(destination: string, request: Request, brandId: BrandId): string {
  if (destination.startsWith('http')) return destination
  const path = destination.startsWith('/') ? destination : `/${destination}`
  return `${getRequestPublicOrigin(request) || getCanonicalOrigin(brandId)}${path}`
}

/** Запрос от Telegram-бота с секретным ключом (whitelist, confirm, promo-stats, review moderation). */
function isTelegramServiceRequest(request: Request): boolean {
  const pathname = new URL(request.url).pathname
  const secret = process.env[SERVICE_SECRET_ENV]
  if (!secret || typeof secret !== 'string') return false
  const key = request.headers.get(SERVICE_HEADER)
  if (key !== secret) return false
  // Разрешаем только известные эндпоинты бота
  if (pathname.startsWith('/api/admin/telegram/')) return true
  if (request.method === 'PATCH' && /^\/api\/admin\/reviews\/[^/]+\/?$/.test(pathname)) return true
  if (request.method === 'POST' && pathname === '/api/admin/reviews/moderation-sync') return true
  return false
}

/** Security headers for all responses (payment-ready, PCI-aware). */
function addSecurityHeaders(request: Request, response: NextResponse): NextResponse {
  // Webvisor and click maps embed the site in an iframe (metrika/webvisor UI).
  // `X-Frame-Options` is too limited (and can conflict with allowed embeddings),
  // so we rely on `Content-Security-Policy: frame-ancestors ...` allowlist below.
  response.headers.delete('X-Frame-Options')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  // CSP: restrict scripts and inline; allow same-origin and trusted payment/analytics if needed
  const frameAncestors =
    "frame-ancestors 'self' https://metrika.yandex.ru https://*.metrika.yandex.ru http://metrika.yandex.ru http://*.metrika.yandex.ru https://metrika.yandex.by https://*.metrika.yandex.by http://metrika.yandex.by http://*.metrika.yandex.by https://metrica.yandex.com https://*.metrica.yandex.com http://metrica.yandex.com http://*.metrica.yandex.com https://metrica.yandex.com.tr https://*.metrica.yandex.com.tr http://metrica.yandex.com.tr http://*.metrica.yandex.com.tr https://webvisor.com https://*.webvisor.com http://webvisor.com http://*.webvisor.com https://mc.yandex.ru https://*.mc.yandex.ru http://mc.yandex.ru http://*.mc.yandex.ru"
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru https://yastatic.net https://mc.yandex.ru", // Yandex Maps JS API + Yandex Metrika
    // Yandex Maps v3 uses WebWorkers from blob:/data: (e.g. content_provider.worker.js).
    "worker-src 'self' blob: data: https://yastatic.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api-maps.yandex.ru https://*.maps.yandex.ru https://*.maps.yandex.net https://yastatic.net https://suggest-maps.yandex.ru https://geocode-maps.yandex.ru https://log.api-maps.yandex.ru https://mc.yandex.ru", // Yandex Maps API + Yandex Metrika
    frameAncestors,
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)
  return response
}

/** Редиректы из БД (Tilda → сайт): запрос к /api/redirect-check, при совпадении — 301 и др. */
async function applyRedirectIfMatched(request: Request): Promise<NextResponse | null> {
  const adminSecretPath = getAdminSecretPath()
  // In dev, avoid internal self-fetch in proxy to prevent local startup hangs.
  if (process.env.NODE_ENV !== 'production') return null

  const pathname = new URL(request.url).pathname
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/login')) return null
  if (pathname.startsWith(`/${adminSecretPath}`)) return null
  const base = new URL(request.url).origin
  const checkUrl = `${base}/api/redirect-check?path=${encodeURIComponent(pathname)}`
  try {
    const res = await fetch(checkUrl, { cache: 'no-store' })
    if (res.status !== 200) return null
    const body = await res.json()
    const destination = body?.destination
    const statusCode = Number(body?.statusCode)
    if (!destination || typeof destination !== 'string') return null
    const code = REDIRECT_STATUS_CODES.has(statusCode) ? statusCode : 301
    const target = createRedirectLocation(destination, request, resolveRedirectBrand(request))
    return new NextResponse(null, {
      status: code,
      headers: { Location: target },
    })
  } catch {
    return null
  }
}

async function proxyHandler(request: Request) {
  const adminSecretPath = getAdminSecretPath()
  const pathname = new URL(request.url).pathname
  const redirectRes = await applyRedirectIfMatched(request)
  if (redirectRes) return redirectRes

  if (pathname.startsWith(`/${adminSecretPath}/`)) {
    const afterPrefix = pathname
      .slice(1 + adminSecretPath.length)
      .replace(/^\/+/, '')
    const [brandSegment, ...restSegments] = afterPrefix.split('/')
    if (BRAND_IDS.has(brandSegment)) {
      const url = new URL(request.url)
      const pathAfterBrand = restSegments.join('/')
      const canonicalAdminPath = pathAfterBrand ? `/admin/${pathAfterBrand}` : '/admin'
      url.pathname = canonicalAdminPath

      const res = NextResponse.rewrite(url)
      res.cookies.set(ADMIN_BRAND_COOKIE_NAME, brandSegment, {
        path: '/',
        sameSite: 'lax',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
      })
      res.headers.set('x-brand', brandSegment)
      return addSecurityHeaders(request, res)
    }
  }

  if (pathname.startsWith(`/${adminSecretPath}`) && adminSecretPath !== 'admin') {
    const rest = pathname.slice(1 + adminSecretPath.length) || ''
    const rewritePath = `/admin${rest}`
    const url = new URL(request.url)
    url.pathname = rewritePath
    const res = NextResponse.rewrite(url)
    return addSecurityHeaders(request, res)
  }
  const res = NextResponse.next()
  return addSecurityHeaders(request, res)
}

const proxyWithAuth = withAuth(proxyHandler, {
  callbacks: {
    authorized: ({ token, req }) => {
      const adminSecretPath = getAdminSecretPath()
      if (isTelegramServiceRequest(req)) return true
      const pathname = new URL(req.url).pathname
      // Token-protected infra alerts endpoint must be callable without NextAuth session.
      if (pathname === '/api/admin/infra-alert') return true
      // Token-protected cron endpoints (background pollers) must be callable without NextAuth.
      if (pathname.startsWith('/api/cron/')) return true
      const isAdminPath = pathname.startsWith(`/${adminSecretPath}`)
      const isAdminApi = pathname.startsWith('/api/admin')
      if (!isAdminPath && !isAdminApi) return true
      return token?.role === 'ADMIN'
    },
  },
})

// Turbopack + next-auth middleware can hang during local dev startup.
// Keep auth middleware in production, and use lightweight proxy in development.
const proxy = process.env.NODE_ENV === 'production' ? proxyWithAuth : proxyHandler
export default proxy

/** Must stay a literal in this file (same module as default) — Next.js 16 rejects `config` re-exported from `middleware.ts`. */
export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/orders',
    '/api/promo/:path*',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/:path*', // custom ADMIN_SECRET_PATH + любые пути для редиректов (Tilda)
  ],
}
