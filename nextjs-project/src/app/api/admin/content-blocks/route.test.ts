import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/require-admin', () => ({
  requireAdminSession: vi.fn(async () => ({ user: { id: 'admin' } })),
}))

vi.mock('@/lib/brand/brand-request', () => ({
  resolveBrandOrDefaultFromRequest: vi.fn(() => 'inner'),
}))

vi.mock('@/services/content-block.service', () => ({
  upsertBlocks: vi.fn(async () => []),
  getAdminBlocksForPage: vi.fn(async () => []),
  resetBlockOverrides: vi.fn(async () => {}),
}))

vi.mock('@/lib/site-revalidation', () => ({
  revalidateContentBlockPage: vi.fn(),
}))

import { GET, PUT } from './route'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import {
  getAdminBlocksForPage,
  resetBlockOverrides,
  upsertBlocks,
} from '@/services/content-block.service'
import { revalidateContentBlockPage } from '@/lib/site-revalidation'

describe('GET /api/admin/content-blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveBrandOrDefaultFromRequest).mockReturnValue('inner')
  })

  it('loads blocks in request brand scope', async () => {
    vi.mocked(resolveBrandOrDefaultFromRequest).mockReturnValue('sprint-power')

    const response = await GET(
      new Request('http://localhost/api/admin/content-blocks?page=home', {
        headers: { 'x-brand': 'sprint-power' },
      })
    )

    expect(response.status).toBe(200)
    expect(getAdminBlocksForPage).toHaveBeenCalledWith('home', 'sprint-power')
  })
})

describe('PUT /api/admin/content-blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveBrandOrDefaultFromRequest).mockReturnValue('inner')
  })

  it('rejects unsafe custom links', async () => {
    const response = await PUT(
      new Request('http://localhost/api/admin/content-blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 'home',
          blocks: [
            {
              page: 'home',
              key: 'hero.cta.href',
              label: 'Hero CTA',
              type: 'short',
              text: 'https://evil.example',
            },
          ],
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'Invalid href for key "hero.cta.href"',
    })
    expect(upsertBlocks).not.toHaveBeenCalled()
    expect(revalidateContentBlockPage).not.toHaveBeenCalled()
  })

  it('accepts safe internal custom links with query and hash', async () => {
    await PUT(
      new Request('http://localhost/api/admin/content-blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 'home',
          blocks: [
            {
              page: 'home',
              key: 'home.directions.item1.href',
              label: 'Direction 1 CTA',
              type: 'short',
              text: '/catalog/bulony?sort=popular#top',
            },
          ],
        }),
      })
    )

    expect(upsertBlocks).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          key: 'home.directions.item1.href',
          text: '/catalog/bulony?sort=popular#top',
        }),
      ],
      'inner'
    )
  })

  it('revalidates the home page after saving home blocks', async () => {
    await PUT(
      new Request('http://localhost/api/admin/content-blocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 'home',
          blocks: [
            {
              page: 'home',
              key: 'home.sections.order',
              label: 'Sections order',
              type: 'short',
              text: 'directions,reviews',
            },
          ],
        }),
      })
    )

    expect(resetBlockOverrides).toHaveBeenCalledWith([], 'inner')
    expect(revalidateContentBlockPage).toHaveBeenCalledWith('home')
    expect(getAdminBlocksForPage).toHaveBeenCalledWith('home', 'inner')
  })
})
