import { describe, expect, it, vi, beforeEach } from 'vitest'
import { revalidatePath } from 'next/cache'
import {
  CONTENT_BLOCK_PAGE_PATHS,
  revalidateContentBlockPage,
  revalidateStorefrontPaths,
} from './site-revalidation'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('revalidateStorefrontPaths', () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear()
  })

  it('revalidates each unique path with layout scope', () => {
    revalidateStorefrontPaths(['/', '/catalog', '/catalog'])

    expect(revalidatePath).toHaveBeenCalledTimes(2)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/catalog', 'layout')
  })
})

describe('revalidateContentBlockPage', () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear()
  })

  it('maps known admin pages to storefront paths', () => {
    revalidateContentBlockPage('about')

    expect(revalidatePath).toHaveBeenCalledWith('/o-nas', 'layout')
  })

  it('revalidates home and catalog listing for home blocks', () => {
    revalidateContentBlockPage('home')

    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/catalog', 'layout')
  })

  it('falls back to root layout for unknown pages', () => {
    revalidateContentBlockPage('unknown-page')

    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('covers every admin content page id', () => {
    const adminPages = [
      'home',
      'about',
      'catalog',
      'cart',
      'faq',
      'contacts',
      'certificates',
      'sotrudnichestvo',
      'footer',
      'legal-privacy',
      'legal-oferta',
    ] as const

    for (const page of adminPages) {
      expect(CONTENT_BLOCK_PAGE_PATHS[page]?.length).toBeGreaterThan(0)
    }
  })
})
