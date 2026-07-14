import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { findRedirectByPath } from '@/services/redirect.service'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { getBrandSiteConfig, getBrandSiteUrl } from '@/lib/brand/site-branding'
import { NotFoundPageContent } from '@/components/site/not-found-page-content'

export const dynamic = 'force-dynamic'

const REDIRECT_METHODS = new Set(['GET', 'HEAD'])
let notFoundStylesPromise: Promise<string> | null = null

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

async function getNotFoundStyles(): Promise<string> {
  if (notFoundStylesPromise) return notFoundStylesPromise

  notFoundStylesPromise = readFile(path.join(process.cwd(), 'src/app/globals.css'), 'utf8')
    .then((css) => {
      const match = css.match(/\/\* 404 page \*\/([\s\S]*?)\/\* Scroll reveal animations \*\//)
      return match?.[1]?.trim() ?? ''
    })
    .catch(() => '')

  return notFoundStylesPromise
}

async function renderNotFoundHtml(brandId: 'inner' | 'sprint-power'): Promise<string> {
  const siteTitle = getBrandSiteConfig(brandId).title
  const styles = await getNotFoundStyles()
  const markup = renderToStaticMarkup(
    createElement(NotFoundPageContent, { homeHref: getBrandSiteUrl(brandId) })
  )

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Страница не найдена | ${siteTitle}</title>
    <style>${styles}</style>
  </head>
  <body>${markup}</body>
</html>`
}

async function handleLegacyRedirect(request: Request): Promise<NextResponse> {
  if (!REDIRECT_METHODS.has(request.method)) {
    return new NextResponse(null, { status: 404 })
  }

  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })

  const url = new URL(request.url)
  const rule = await findRedirectByPath(url.pathname, { brandId: activeBrand })
  if (!rule) {
    if (request.method === 'HEAD') {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse(await renderNotFoundHtml(activeBrand), {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
      },
    })
  }

  const target = createRedirectLocation(rule.destination, request, headerStore, activeBrand)

  return new NextResponse(null, {
    status: rule.statusCode,
    headers: { Location: target },
  })
}

export const GET = handleLegacyRedirect
export const HEAD = handleLegacyRedirect
