import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { findRedirectByPath } from '@/services/redirect.service'
import { resolveSiteBrand } from '@/lib/brand/brand-context'

export const dynamic = 'force-dynamic'

const REDIRECT_METHODS = new Set(['GET', 'HEAD'])

async function handleLegacyRedirect(request: Request): Promise<NextResponse> {
  if (!REDIRECT_METHODS.has(request.method)) notFound()

  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })

  const url = new URL(request.url)
  const rule = await findRedirectByPath(url.pathname, { brandId: activeBrand })
  if (!rule) notFound()

  const target = rule.destination.startsWith('http')
    ? rule.destination
    : new URL(rule.destination.startsWith('/') ? rule.destination : `/${rule.destination}`, url.origin).toString()

  return NextResponse.redirect(target, rule.statusCode)
}

export const GET = handleLegacyRedirect
export const HEAD = handleLegacyRedirect

