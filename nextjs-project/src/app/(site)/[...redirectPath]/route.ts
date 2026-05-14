import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { findRedirectByPath } from '@/services/redirect.service'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { getBrandSiteUrl } from '@/lib/brand/site-branding'

export const dynamic = 'force-dynamic'

const REDIRECT_METHODS = new Set(['GET', 'HEAD'])

function getRequestPublicOrigin(request: Request, headerStore: Headers): string | null {
  const host = (
    headerStore.get('x-forwarded-host') ||
    headerStore.get('host') ||
    new URL(request.url).host ||
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

  const proto = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  return `${proto}://${host}`.replace(/\/+$/, '')
}

function createRedirectLocation(
  destination: string,
  request: Request,
  headerStore: Headers,
  brandId: 'inner' | 'sprint-power'
): string {
  if (destination.startsWith('http')) return destination
  const path = destination.startsWith('/') ? destination : `/${destination}`
  return `${getRequestPublicOrigin(request, headerStore) || getBrandSiteUrl(brandId).replace(/\/+$/, '')}${path}`
}

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

  const target = createRedirectLocation(rule.destination, request, headerStore, activeBrand)

  return new NextResponse(null, {
    status: rule.statusCode,
    headers: { Location: target },
  })
}

export const GET = handleLegacyRedirect
export const HEAD = handleLegacyRedirect
