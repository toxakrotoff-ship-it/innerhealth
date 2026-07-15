import { extractPlainTextFromTipTap } from '@/lib/tiptap-plain-text'
import { normalizeSeoDescription, trimToNull } from '@/lib/seo'

export interface CategoryPageContentFields {
  title: string
  pageTitle?: string | null
  catalogTeaser?: string | null
  imageAlt?: string | null
  seoDescription?: string | null
  linePageBodyRichJson?: unknown
  showLegacyLinePageBlocks?: boolean
}

export function hasNonEmptyTipTapDoc(raw: unknown): boolean {
  if (raw == null) return false
  if (typeof raw === 'string') {
    const text = raw.trim()
    if (!text) return false
    try {
      const parsed = JSON.parse(text) as { type?: string; content?: unknown[] }
      return parsed?.type === 'doc' && Array.isArray(parsed.content) && parsed.content.length > 0
    } catch {
      return text.length > 0
    }
  }
  if (typeof raw === 'object') {
    const doc = raw as { type?: string; content?: unknown[] }
    return doc.type === 'doc' && Array.isArray(doc.content) && doc.content.length > 0
  }
  return false
}

export function resolveCategoryHeading(category: Pick<CategoryPageContentFields, 'title' | 'pageTitle'>): string {
  return trimToNull(category.pageTitle) ?? category.title
}

export function resolveCategoryTeaser(
  category: Pick<CategoryPageContentFields, 'catalogTeaser'>
): string | null {
  return trimToNull(category.catalogTeaser)
}

export function resolveCategoryImageAlt(
  category: Pick<CategoryPageContentFields, 'title' | 'pageTitle' | 'imageAlt'>
): string {
  return trimToNull(category.imageAlt) ?? trimToNull(category.pageTitle) ?? category.title
}

export function resolveCategoryDescriptionDoc(options: {
  linePageBodyRichJson?: unknown
  legacyDoc?: unknown | null
  showLegacyLinePageBlocks?: boolean
}): unknown | null {
  if (hasNonEmptyTipTapDoc(options.linePageBodyRichJson)) {
    return options.linePageBodyRichJson ?? null
  }
  if (options.showLegacyLinePageBlocks) {
    return options.legacyDoc ?? null
  }
  return null
}

export function resolveCategoryMetadataDescription(options: {
  category: Pick<CategoryPageContentFields, 'seoDescription' | 'linePageBodyRichJson' | 'showLegacyLinePageBlocks'>
  legacyDoc?: unknown | null
  fallbackDescription: string
}): string {
  const seoDescription = normalizeSeoDescription(options.category.seoDescription, 200)
  if (seoDescription) return seoDescription

  const richTextDescription = extractPlainTextFromTipTap(options.category.linePageBodyRichJson, 158)
  if (richTextDescription) return richTextDescription

  if (options.category.showLegacyLinePageBlocks) {
    const legacyDescription = extractPlainTextFromTipTap(options.legacyDoc, 158)
    if (legacyDescription) return legacyDescription
  }

  return options.fallbackDescription
}
