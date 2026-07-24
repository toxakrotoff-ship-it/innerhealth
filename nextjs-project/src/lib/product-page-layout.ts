import type { ContentBlockResolved } from '@/services/content-block.service'

export const PRODUCT_DOCUMENTS_PLACEMENT_VALUES = ['before-tabs', 'after-tabs'] as const

export type ProductDocumentsPlacement = (typeof PRODUCT_DOCUMENTS_PLACEMENT_VALUES)[number]

export const DEFAULT_PRODUCT_DOCUMENTS_PLACEMENT: ProductDocumentsPlacement = 'before-tabs'

function getText(blocks: ContentBlockResolved[], key: string, fallback = ''): string {
  const block = blocks.find((item) => item.key === key)
  const text = block?.text?.trim()
  return text && text.length > 0 ? text : fallback
}

/**
 * Resolves where structured product documents render relative to description tabs.
 * Accepted values: `before-tabs` | `after-tabs` (case-insensitive).
 */
export function resolveProductDocumentsPlacement(
  blocks: ContentBlockResolved[]
): ProductDocumentsPlacement {
  const raw = getText(blocks, 'product.documents.placement', DEFAULT_PRODUCT_DOCUMENTS_PLACEMENT)
    .trim()
    .toLowerCase()

  if (raw === 'after-tabs' || raw === 'after' || raw === 'после' || raw === 'после-табов') {
    return 'after-tabs'
  }

  if (raw === 'before-tabs' || raw === 'before' || raw === 'до' || raw === 'до-табов') {
    return 'before-tabs'
  }

  return DEFAULT_PRODUCT_DOCUMENTS_PLACEMENT
}
