import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { describe, expect, it } from 'vitest'
import {
  hasNonEmptyTipTapDoc,
  resolveCategoryDescriptionDoc,
  resolveCategoryHeading,
  resolveCategoryImageAlt,
  resolveCategoryMetadataDescription,
  resolveCategoryTeaser,
} from './category-page-content'

const richDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Новый rich text категории' }] }],
}

const legacyDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Legacy текст категории' }] }],
}

describe('category-page-content', () => {
  it('uses pageTitle as the page heading when present', () => {
    expect(resolveCategoryHeading({ title: 'Категория', pageTitle: 'Отдельный H1' })).toBe(
      'Отдельный H1'
    )
  })

  it('falls back to title when pageTitle is empty', () => {
    expect(resolveCategoryHeading({ title: 'Категория', pageTitle: '   ' })).toBe('Категория')
  })

  it('returns teaser only when it contains text', () => {
    expect(resolveCategoryTeaser({ catalogTeaser: 'Короткое описание' })).toBe('Короткое описание')
    expect(resolveCategoryTeaser({ catalogTeaser: '   ' })).toBeNull()
  })

  it('prefers the new rich text over legacy fallback', () => {
    expect(
      resolveCategoryDescriptionDoc({
        linePageBodyRichJson: richDoc,
        legacyDoc,
        showLegacyLinePageBlocks: true,
      })
    ).toEqual(richDoc)
  })

  it('uses legacy content only when the toggle is enabled and rich text is empty', () => {
    expect(
      resolveCategoryDescriptionDoc({
        linePageBodyRichJson: null,
        legacyDoc,
        showLegacyLinePageBlocks: true,
      })
    ).toEqual(legacyDoc)

    expect(
      resolveCategoryDescriptionDoc({
        linePageBodyRichJson: null,
        legacyDoc,
        showLegacyLinePageBlocks: false,
      })
    ).toBeNull()
  })

  it('resolves image alt via imageAlt -> pageTitle -> title', () => {
    expect(
      resolveCategoryImageAlt({
        title: 'Категория',
        pageTitle: 'Отдельный H1',
        imageAlt: 'Свое alt',
      })
    ).toBe('Свое alt')
    expect(resolveCategoryImageAlt({ title: 'Категория', pageTitle: 'Отдельный H1' })).toBe(
      'Отдельный H1'
    )
    expect(resolveCategoryImageAlt({ title: 'Категория', pageTitle: ' ' })).toBe('Категория')
  })

  it('resolves metadata description via SEO, then rich text, then legacy, then fallback', () => {
    expect(
      resolveCategoryMetadataDescription({
        category: { seoDescription: 'SEO описание', linePageBodyRichJson: richDoc },
        legacyDoc,
        fallbackDescription: 'fallback',
      })
    ).toBe('SEO описание')

    expect(
      resolveCategoryMetadataDescription({
        category: { seoDescription: null, linePageBodyRichJson: richDoc },
        legacyDoc,
        fallbackDescription: 'fallback',
      })
    ).toContain('Новый rich text категории')

    expect(
      resolveCategoryMetadataDescription({
        category: {
          seoDescription: null,
          linePageBodyRichJson: null,
          showLegacyLinePageBlocks: true,
        },
        legacyDoc,
        fallbackDescription: 'fallback',
      })
    ).toContain('Legacy текст категории')

    expect(
      resolveCategoryMetadataDescription({
        category: {
          seoDescription: null,
          linePageBodyRichJson: null,
          showLegacyLinePageBlocks: false,
        },
        legacyDoc,
        fallbackDescription: 'fallback',
      })
    ).toBe('fallback')
  })

  it('recognizes empty and non-empty TipTap docs', () => {
    expect(hasNonEmptyTipTapDoc({ type: 'doc', content: [] })).toBe(false)
    expect(hasNonEmptyTipTapDoc(richDoc)).toBe(true)
  })
})
