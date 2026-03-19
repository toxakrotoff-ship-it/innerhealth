import 'server-only'

import { stripHtmlToPlainText } from '@/lib/plain-text'

interface TipTapNode {
  type?: string
  content?: TipTapNode[]
  text?: string
}

const DEFAULT_MAX_CHARS = 50_000

/**
 * Flattens TipTap/ProseMirror JSON to plain text with block boundaries for GEO / articleBody.
 */
export function extractPlainTextFromTipTap(root: unknown, maxChars: number = DEFAULT_MAX_CHARS): string {
  function fromNode(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as TipTapNode
    if (n.type === 'text') return n.text ?? ''
    if (!Array.isArray(n.content)) return ''

    const inner = n.content.map(fromNode).join('')

    switch (n.type) {
      case 'doc':
        return inner
      case 'paragraph':
      case 'heading':
      case 'blockquote':
        return inner.trim() ? `${inner.trim()}\n\n` : ''
      case 'listItem':
        return inner.trim() ? `• ${inner.trim()}\n` : ''
      case 'bulletList':
      case 'orderedList':
        return inner.trim() ? `${inner}\n` : ''
      case 'hardBreak':
        return '\n'
      case 'image':
        return ''
      default:
        return inner
    }
  }

  let parsed: unknown = root
  if (typeof root === 'string') {
    const t = root.trim()
    if (!t) return ''
    try {
      parsed = JSON.parse(t) as unknown
    } catch {
      return stripHtmlToPlainText(t, maxChars)
    }
  }

  if (!parsed || typeof parsed !== 'object') return ''

  const out = fromNode(parsed).replace(/\n{3,}/g, '\n\n').trim()
  if (out.length <= maxChars) return out
  return `${out.slice(0, maxChars - 1).trimEnd()}…`
}

/**
 * Normalizes stored post.content (TipTap doc JSON, JSON string, or HTML/plain string) to plain text.
 */
export function extractPlainTextFromPostContent(raw: unknown, maxChars: number = DEFAULT_MAX_CHARS): string {
  if (raw == null) return ''
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return ''
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        return extractPlainTextFromTipTap(JSON.parse(t) as unknown, maxChars)
      } catch {
        return stripHtmlToPlainText(t, maxChars)
      }
    }
    return stripHtmlToPlainText(t, maxChars)
  }
  if (typeof raw === 'object') {
    const obj = raw as TipTapNode
    if (obj.type === 'doc') {
      return extractPlainTextFromTipTap(raw, maxChars)
    }
  }
  return ''
}
