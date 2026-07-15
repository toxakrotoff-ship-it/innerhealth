import { describe, expect, it } from 'vitest'
import {
  buildStoredProductDocumentFileName,
  detectProductDocumentMime,
  normalizeDocumentBaseName,
} from '@/lib/product-document-files'

describe('product-document-files', () => {
  it('detects PDF by signature', () => {
    const buffer = Buffer.from('%PDF-1.7 sample')
    expect(detectProductDocumentMime(buffer)).toBe('application/pdf')
  })

  it('normalizes unsafe file names', () => {
    expect(normalizeDocumentBaseName('../My File<script>.pdf')).toBe('my-file-script-.pdf')
  })

  it('builds a unique stored file name inside brand scope', () => {
    const fileName = buildStoredProductDocumentFileName({
      brand: 'sprint-power',
      originalName: 'Protocol 01.pdf',
      mimeType: 'application/pdf',
    })

    expect(fileName).toMatch(/^sprint-power-protocol-01-[a-z0-9-]+\.pdf$/)
  })
})
