import 'server-only'

import type { JSONContent } from '@tiptap/core'
import { generateJSON } from '@tiptap/core'
import { JSDOM } from 'jsdom'
import { buildRichTextEditorExtensions } from '@/app/admin/news/components/rich-text-editor-extensions'
import { getPrivacyPageFallbackHtml } from '@/components/site/legal/privacy-page-fallback-content'
import type { BrandId } from '@/lib/brand/brand'
import { getBrandSiteConfig, getBrandSiteUrl } from '@/lib/brand/site-branding'

const LEGAL_EDITOR_EXTENSIONS = buildRichTextEditorExtensions('')
const legalFallbackCache = new Map<string, JSONContent>()

function generateRichJsonFromHtml(html: string): JSONContent {
  const previousWindow = (globalThis as { window?: unknown }).window
  const previousDocument = (globalThis as { document?: unknown }).document
  const dom = new JSDOM('<!doctype html><html><body></body></html>')

  ;(globalThis as { window?: unknown }).window = dom.window
  ;(globalThis as { document?: unknown }).document = dom.window.document

  try {
    return generateJSON(html, LEGAL_EDITOR_EXTENSIONS) as JSONContent
  } finally {
    dom.window.close()

    if (previousWindow === undefined) {
      delete (globalThis as { window?: unknown }).window
    } else {
      ;(globalThis as { window?: unknown }).window = previousWindow
    }

    if (previousDocument === undefined) {
      delete (globalThis as { document?: unknown }).document
    } else {
      ;(globalThis as { document?: unknown }).document = previousDocument
    }
  }
}

function buildPrivacyFallbackRichJson(brandId: BrandId): JSONContent {
  const siteUrl = getBrandSiteUrl(brandId)
  const email = getBrandSiteConfig(brandId).contact.email
  const privacyUrl = `${siteUrl.replace(/\/+$/, '')}/privacy`

  const html = getPrivacyPageFallbackHtml({ siteUrl, email, privacyUrl })

  return generateRichJsonFromHtml(html)
}

export function getAdminLegalFallbackRichJson(
  page: string,
  brandId: BrandId
): JSONContent | null {
  if (page !== 'legal-privacy') return null

  const cacheKey = `${brandId}:${page}`
  const cached = legalFallbackCache.get(cacheKey)
  if (cached) return cached

  const generated = buildPrivacyFallbackRichJson(brandId)
  legalFallbackCache.set(cacheKey, generated)
  return generated
}
