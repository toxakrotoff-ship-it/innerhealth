import { describe, expect, it } from 'vitest'
import { createProductDocumentSchema } from '@/lib/validations/product-document'

describe('createProductDocumentSchema', () => {
  it('accepts uploaded documents even when mimeType is omitted', () => {
    const result = createProductDocumentSchema.safeParse({
      productId: 'product-1',
      title: 'Политика конфиденциальности',
      type: 'DECLARATION',
      fileUrl: '/uploads/documents/privacy.pdf',
      fileName: 'privacy.pdf',
      originalName: 'privacy.pdf',
      fileSize: 1024,
      sortOrder: 0,
      isPublished: true,
    })

    expect(result.success).toBe(true)
  })
})
