import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { findRedirectByPath } from '@/services/redirect.service'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { getBrandSiteConfig, getBrandSiteUrl } from '@/lib/brand/site-branding'

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
  const homeHref = getBrandSiteUrl(brandId)
  const markup = `
    <main class="not-found-root">
      <div class="not-found-background" aria-hidden="true"></div>
      <div class="not-found-layout">
        <section class="not-found-card">
          <div class="not-found-code-row">
            <span class="not-found-code-digit">4</span>
            <div class="not-found-compass-wrapper">
              <div class="not-found-compass">
                <svg class="not-found-compass-svg" viewBox="0 0 110 110" aria-hidden="true">
                  <circle cx="55" cy="55" r="44" fill="none" stroke="#00A8FF" stroke-width="4"></circle>
                  <circle cx="55" cy="55" r="28" fill="none" stroke="#00A8FF" stroke-width="4"></circle>
                  <circle cx="55" cy="11" r="5" fill="#00A8FF"></circle>
                  <circle cx="11" cy="55" r="5" fill="#22C55E"></circle>
                  <circle cx="99" cy="55" r="5" fill="#F97316"></circle>
                  <circle cx="55" cy="99" r="5" fill="#00A8FF"></circle>
                  <g class="not-found-compass-arrow">
                    <path d="M55 25 L62 55 L55 85 L48 55 Z" fill="#00A8FF"></path>
                    <path d="M55 30 L60 55 L55 80 L50 55 Z" fill="#ffffff"></path>
                  </g>
                </svg>
              </div>
            </div>
            <span class="not-found-code-digit">4</span>
          </div>
          <div class="not-found-text-group not-found-text-group-primary">
            <h1 class="not-found-title">Похоже, мы свернули не туда.</h1>
          </div>
          <div class="not-found-text-group not-found-text-group-secondary">
            <p class="not-found-description">Страница потерялась, но путь домой — по кнопке ниже.</p>
          </div>
          <div class="not-found-button-wrapper">
            <a href="${homeHref}" class="not-found-button">
              <span class="relative z-10">Вернуться на главную</span>
              <span class="not-found-button-flash" aria-hidden="true"></span>
            </a>
          </div>
          <div class="not-found-dots" aria-hidden="true">
            <span class="not-found-dot not-found-dot--muted"></span>
            <span class="not-found-dot not-found-dot--active"></span>
            <span class="not-found-dot not-found-dot--muted"></span>
          </div>
        </section>
      </div>
    </main>
  `.trim()

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
