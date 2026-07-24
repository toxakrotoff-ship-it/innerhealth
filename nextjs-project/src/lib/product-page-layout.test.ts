import { describe, expect, it } from 'vitest'
import type { ContentBlockResolved } from '@/services/content-block.service'
import {
  DEFAULT_PRODUCT_DOCUMENTS_PLACEMENT,
  resolveProductDocumentsPlacement,
} from '@/lib/product-page-layout'

function shortBlock(key: string, text: string | null): ContentBlockResolved {
  return {
    key,
    label: key,
    type: 'short',
    text,
    richJson: null,
    colorToken: null,
    fontVariant: null,
    fontWeight: null,
  }
}

describe('resolveProductDocumentsPlacement', () => {
  it('defaults to before-tabs when block is missing', () => {
    expect(resolveProductDocumentsPlacement([])).toBe(DEFAULT_PRODUCT_DOCUMENTS_PLACEMENT)
  })

  it('accepts after-tabs aliases', () => {
    expect(resolveProductDocumentsPlacement([shortBlock('product.documents.placement', 'after-tabs')])).toBe(
      'after-tabs'
    )
    expect(resolveProductDocumentsPlacement([shortBlock('product.documents.placement', 'после')])).toBe(
      'after-tabs'
    )
  })

  it('falls back to default for unknown values', () => {
    expect(resolveProductDocumentsPlacement([shortBlock('product.documents.placement', 'somewhere')])).toBe(
      'before-tabs'
    )
  })
})

describe('product admin content schema', () => {
  it('exposes documents placement for both brands', async () => {
    const { getAdminContentSchemaForBrandPage } = await import('@/config/content-blocks-defaults')
    expect(getAdminContentSchemaForBrandPage('inner', 'product').map((entry) => entry.key)).toContain(
      'product.documents.placement'
    )
    expect(getAdminContentSchemaForBrandPage('sprint-power', 'product').map((entry) => entry.key)).toContain(
      'product.documents.placement'
    )
  })
})
