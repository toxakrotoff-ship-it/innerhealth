import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/services/content-block.service', () => ({
  getResolvedBlocksForPage: vi.fn(),
}))

import { getResolvedBlocksForPage } from '@/services/content-block.service'
import { buildContentPageMetadata, parseSeoKeywords } from './seo'

describe('parseSeoKeywords', () => {
  it('splits by commas and semicolons, trims, and deduplicates', () => {
    expect(parseSeoKeywords(' collagen, peptides;; collagen ; wellness ')).toEqual([
      'collagen',
      'peptides',
      'wellness',
    ])
  })

  it('returns undefined for empty values', () => {
    expect(parseSeoKeywords('   ')).toBeUndefined()
    expect(parseSeoKeywords(null)).toBeUndefined()
  })
})

describe('buildContentPageMetadata', () => {
  beforeEach(() => {
    vi.mocked(getResolvedBlocksForPage).mockReset()
  })

  it('uses content-block SEO overrides and canonical path', async () => {
    vi.mocked(getResolvedBlocksForPage).mockResolvedValue([
      { key: 'seo.title', label: '', type: 'short', text: 'SEO title', richJson: null, colorToken: null, fontVariant: null, fontWeight: null },
      { key: 'seo.description', label: '', type: 'short', text: 'SEO description', richJson: null, colorToken: null, fontVariant: null, fontWeight: null },
      { key: 'seo.ogImage', label: '', type: 'short', text: 'https://cdn.example.com/og.png', richJson: null, colorToken: null, fontVariant: null, fontWeight: null },
    ])

    const metadata = await buildContentPageMetadata({
      brandId: 'inner',
      page: 'about',
      path: '/o-nas',
      fallbackTitle: 'Fallback title',
      fallbackDescription: 'Fallback description',
    })

    expect(metadata.title).toBe('SEO title')
    expect(metadata.description).toBe('SEO description')
    expect(metadata.alternates).toEqual({ canonical: '/o-nas' })
    expect(metadata.openGraph).toMatchObject({
      title: 'SEO title',
      description: 'SEO description',
      url: '/o-nas',
      images: [{ url: 'https://cdn.example.com/og.png', alt: 'SEO title' }],
    })
  })

  it('falls back when SEO blocks are blank', async () => {
    vi.mocked(getResolvedBlocksForPage).mockResolvedValue([
      { key: 'seo.title', label: '', type: 'short', text: '   ', richJson: null, colorToken: null, fontVariant: null, fontWeight: null },
    ])

    const metadata = await buildContentPageMetadata({
      brandId: 'inner',
      page: 'faq',
      path: '/faq',
      fallbackTitle: 'FAQ',
      fallbackDescription: 'Fallback FAQ description',
    })

    expect(metadata.title).toBe('FAQ')
    expect(metadata.description).toBe('Fallback FAQ description')
    expect(metadata.openGraph).toMatchObject({
      title: 'FAQ',
      description: 'Fallback FAQ description',
      url: '/faq',
    })
  })
})
