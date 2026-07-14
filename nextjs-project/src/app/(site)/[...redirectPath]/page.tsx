import { headers } from 'next/headers'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { findRedirectByPath } from '@/services/redirect.service'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { getBrandSiteUrl } from '@/lib/brand/site-branding'

export const dynamic = 'force-dynamic'

function getPublicOrigin(headerStore: Headers, brandId: 'inner' | 'sprint-power'): string {
  const host = (
    headerStore.get('x-forwarded-host') ||
    headerStore.get('host') ||
    ''
  ).trim()

  if (!host) return getBrandSiteUrl(brandId).replace(/\/+$/, '')

  const normalizedHost = host.toLowerCase()
  if (
    normalizedHost.startsWith('localhost') ||
    normalizedHost.startsWith('127.0.0.1') ||
    normalizedHost.startsWith('0.0.0.0') ||
    normalizedHost === 'app' ||
    normalizedHost.startsWith('app:')
  ) {
    return getBrandSiteUrl(brandId).replace(/\/+$/, '')
  }

  const proto = headerStore.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  return `${proto}://${host}`.replace(/\/+$/, '')
}

function createRedirectLocation(
  destination: string,
  headerStore: Headers,
  brandId: 'inner' | 'sprint-power'
): string {
  if (destination.startsWith('http')) return destination
  const path = destination.startsWith('/') ? destination : `/${destination}`
  return `${getPublicOrigin(headerStore, brandId)}${path}`
}

export default async function LegacyRedirectFallbackPage({
  params,
}: {
  params: Promise<{ redirectPath?: string[] }>
}) {
  const { redirectPath } = await params
  const pathname = `/${redirectPath?.join('/') ?? ''}`.replace(/\/+$/, '') || '/'
  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })

  const rule = await findRedirectByPath(pathname, { brandId: activeBrand })
  if (!rule) notFound()

  const target = createRedirectLocation(rule.destination, headerStore, activeBrand)

  if (rule.statusCode === 301 || rule.statusCode === 308) {
    permanentRedirect(target)
  }

  redirect(target)
}
