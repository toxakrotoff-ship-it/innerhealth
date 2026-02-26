import NextAuth from 'next-auth'
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const adminSecretPath = process.env.ADMIN_SECRET_PATH || 'admin'
const SERVICE_HEADER = 'x-service-key'
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET'

/** Запрос от Telegram-бота с секретным ключом (whitelist, confirm, promo-stats, reviews PATCH). */
function isTelegramServiceRequest(request: Request): boolean {
  const pathname = new URL(request.url).pathname
  const secret = process.env[SERVICE_SECRET_ENV]
  if (!secret || typeof secret !== 'string') return false
  const key = request.headers.get(SERVICE_HEADER)
  if (key !== secret) return false
  // Разрешаем только известные эндпоинты бота
  if (pathname.startsWith('/api/admin/telegram/')) return true
  if (request.method === 'PATCH' && /^\/api\/admin\/reviews\/[^/]+\/?$/.test(pathname)) return true
  return false
}

/** Security headers for all responses (payment-ready, PCI-aware). */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  // CSP: restrict scripts and inline; allow same-origin and trusted payment/analytics if needed
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js/React need unsafe-inline/eval in dev; tighten for prod
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)
  return response
}

/** Редиректы из БД (Tilda → сайт): запрос к /api/redirect-check, при совпадении — 301 и др. */
async function applyRedirectIfMatched(request: Request): Promise<NextResponse | null> {
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
    const allowed = [301, 302, 307, 308]
    const code = allowed.includes(statusCode) ? statusCode : 301
    const target = destination.startsWith('http') ? destination : `${base}${destination.startsWith('/') ? '' : '/'}${destination}`
    return NextResponse.redirect(target, code)
  } catch {
    return null
  }
}

async function proxyHandler(request: Request) {
  const pathname = new URL(request.url).pathname
  const redirectRes = await applyRedirectIfMatched(request)
  if (redirectRes) return redirectRes
  if (pathname.startsWith(`/${adminSecretPath}`) && adminSecretPath !== 'admin') {
    const rest = pathname.slice(1 + adminSecretPath.length) || ''
    const rewritePath = `/admin${rest}`
    const res = NextResponse.rewrite(new URL(rewritePath, request.url))
    return addSecurityHeaders(res)
  }
  const res = NextResponse.next()
  return addSecurityHeaders(res)
}

const proxyWithAuth = withAuth(proxyHandler, {
  callbacks: {
    authorized: ({ token, req }) => {
      if (isTelegramServiceRequest(req)) return true
      const pathname = new URL(req.url).pathname
      const isAdminPath = pathname.startsWith(`/${adminSecretPath}`)
      const isAdminApi = pathname.startsWith('/api/admin')
      if (!isAdminPath && !isAdminApi) return true
      return !!token
    },
  },
})

// Turbopack + next-auth middleware can hang during local dev startup.
// Keep auth middleware in production, and use lightweight proxy in development.
const proxy = process.env.NODE_ENV === 'production' ? proxyWithAuth : proxyHandler
export default proxy

const productionMatcher = [
  '/',
  '/admin/:path*',
  '/api/admin/:path*',
  '/api/orders',
  '/api/promo/:path*',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/:segment/:path*', // custom ADMIN_SECRET_PATH + любые пути для редиректов (Tilda)
]

const developmentMatcher = [
  '/admin/:path*',
  '/api/admin/:path*',
]

export const config = {
  matcher: process.env.NODE_ENV === 'production' ? productionMatcher : developmentMatcher,
}
