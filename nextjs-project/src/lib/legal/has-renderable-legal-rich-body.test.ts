import { describe, it, expect } from 'vitest'
import { hasRenderableLegalRichBody } from '@/lib/legal/has-renderable-legal-rich-body'

describe('hasRenderableLegalRichBody', () => {
  it('returns false for null and empty doc', () => {
    expect(hasRenderableLegalRichBody(null)).toBe(false)
    expect(hasRenderableLegalRichBody({ type: 'doc', content: [] })).toBe(false)
  })

  it('returns false for single empty paragraph', () => {
    expect(
      hasRenderableLegalRichBody({
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      })
    ).toBe(false)
  })

  it('returns true when paragraph has text', () => {
    expect(
      hasRenderableLegalRichBody({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello' }],
          },
        ],
      })
    ).toBe(true)
  })
})
