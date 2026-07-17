import 'server-only'

import type { CheerioAPI } from 'cheerio'
import { load } from 'cheerio'
import type { Element } from 'domhandler'
import type { JSONContent } from '@tiptap/core'
import { getPrivacyPageFallbackHtml } from '@/components/site/legal/privacy-page-fallback-content'
import type { BrandId } from '@/lib/brand/brand'
import { getBrandSiteConfig, getBrandSiteUrl } from '@/lib/brand/site-branding'

const legalFallbackCache = new Map<string, JSONContent>()

function toTextNode(text: string, marks?: JSONContent['marks']): JSONContent | null {
  if (!text) return null
  return marks && marks.length > 0
    ? { type: 'text', text, marks }
    : { type: 'text', text }
}

function mergeMarks(parent: JSONContent['marks'], next?: JSONContent['marks']): JSONContent['marks'] {
  if (!parent?.length) return next ?? []
  if (!next?.length) return parent
  return [...parent, ...next]
}

function parseInlineNodes(
  $: CheerioAPI,
  node: Element,
  inheritedMarks: JSONContent['marks'] = []
): JSONContent[] {
  if (node.type === 'text') {
    const textNode = toTextNode(node.data ?? '', inheritedMarks)
    return textNode ? [textNode] : []
  }

  if (node.type !== 'tag') return []

  const name = node.tagName.toLowerCase()
  const localMarks: JSONContent['marks'] = []

  if (name === 'strong' || name === 'b') {
    localMarks.push({ type: 'bold' })
  }

  if (name === 'a') {
    const href = $(node).attr('href')
    if (href) {
      localMarks.push({
        type: 'link',
        attrs: {
          href,
          target: href.startsWith('mailto:') ? null : '_blank',
          rel: href.startsWith('mailto:') ? null : 'noopener noreferrer',
        },
      })
    }
  }

  const mergedMarks = mergeMarks(inheritedMarks, localMarks)
  const children = $(node)
    .contents()
    .toArray()
    .flatMap((child) => parseInlineNodes($, child, mergedMarks))

  return children
}

function buildParagraphFromListItem($: CheerioAPI, node: Element): JSONContent {
  const content = $(node)
    .contents()
    .toArray()
    .flatMap((child) => parseInlineNodes($, child))

  return content.length > 0
    ? { type: 'paragraph', content }
    : { type: 'paragraph' }
}

function parseBlockNode($: CheerioAPI, node: Element): JSONContent | null {
  if (node.type !== 'tag') return null

  const name = node.tagName.toLowerCase()

  if (name === 'h1' || name === 'h2' || name === 'h3') {
    const level = Number(name.slice(1))
    const content = $(node)
      .contents()
      .toArray()
      .flatMap((child) => parseInlineNodes($, child))

    return content.length > 0
      ? { type: 'heading', attrs: { level }, content }
      : { type: 'heading', attrs: { level } }
  }

  if (name === 'p') {
    const content = $(node)
      .contents()
      .toArray()
      .flatMap((child) => parseInlineNodes($, child))

    return content.length > 0
      ? { type: 'paragraph', content }
      : { type: 'paragraph' }
  }

  if (name === 'ul' || name === 'ol') {
    const type = name === 'ul' ? 'bulletList' : 'orderedList'
    const items = $(node)
      .children('li')
      .toArray()
      .map((item) => ({
        type: 'listItem',
        content: [buildParagraphFromListItem($, item)],
      }))

    return items.length > 0 ? { type, content: items } : null
  }

  if (name === 'div') {
    return null
  }

  return null
}

function htmlToSimpleTipTapDoc(html: string): JSONContent {
  const $ = load(html)
  const rootChildren = $('body').children().first().children().toArray()
  const content = rootChildren
    .map((node) => parseBlockNode($, node))
    .filter((node): node is JSONContent => node != null)

  return { type: 'doc', content }
}

function buildPrivacyFallbackRichJson(brandId: BrandId): JSONContent {
  const siteUrl = getBrandSiteUrl(brandId)
  const email = getBrandSiteConfig(brandId).contact.email
  const privacyUrl = `${siteUrl.replace(/\/+$/, '')}/privacy`

  const html = getPrivacyPageFallbackHtml({ siteUrl, email, privacyUrl })

  return htmlToSimpleTipTapDoc(html)
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
