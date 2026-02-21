import NextAuth from 'next-auth'
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

const adminSecretPath = process.env.ADMIN_SECRET_PATH || 'admin'

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

export default withAuth(
  function middleware(request) {
    const res = NextResponse.next()
    return addSecurityHeaders(res)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        const isAdminPath = pathname.startsWith(`/${adminSecretPath}`)
        const isAdminApi = pathname.startsWith('/api/admin')
        if (!isAdminPath && !isAdminApi) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/orders',
    '/api/promo/:path*',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ],
}