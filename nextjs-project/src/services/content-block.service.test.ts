import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { findManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contentBlock: {
      findMany: findManyMock,
    },
  },
}))

import { getAdminBlocksForPage } from '@/services/content-block.service'

describe('getAdminBlocksForPage', () => {
  beforeEach(() => {
    findManyMock.mockReset()
  })

  it('returns privacy fallback block for admin when DB is empty', async () => {
    findManyMock.mockResolvedValue([])

    const result = await getAdminBlocksForPage('legal-privacy', 'inner')

    expect(findManyMock).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      page: 'legal-privacy',
      key: 'legal-privacy.body',
      type: 'rich',
    })
    expect(JSON.stringify(result[0]?.richJson)).toContain('Индивидуальный Предприниматель Кудимов Валерий Валерьевич')
  })

  it('loads Sprint Power about defaults instead of Inner Health copy', async () => {
    findManyMock.mockResolvedValue([])

    const result = await getAdminBlocksForPage('about', 'sprint-power')
    const block1 = result.find((block) => block.key === 'about.block1')
    const block2Title = result.find((block) => block.key === 'about.block2.title')
    const block2Text = result.find((block) => block.key === 'about.block2.text')

    expect(block2Title).toMatchObject({
      text: 'Sprint Power',
      valueSource: 'brand_default',
      isInherited: true,
    })
    expect(JSON.stringify(block1?.richJson)).toContain('спортивное питание')
    expect(JSON.stringify(block1?.richJson)).not.toContain('Inner Health')
    expect(JSON.stringify(block1?.richJson)).not.toContain('Формула красоты')
    expect(JSON.stringify(block2Text?.richJson)).toContain('Sprint Power')
    expect(JSON.stringify(block2Text?.richJson)).not.toContain('Inner Health')
    expect(JSON.stringify(block2Text?.richJson)).not.toContain('PreventAge')
  })

  it('keeps an empty string override as an explicit hidden value', async () => {
    findManyMock.mockResolvedValue([
      {
        id: 'block-1',
        brand: 'inner',
        page: 'home',
        key: 'hero.description',
        label: 'Hero — Описание',
        type: 'short',
        text: '',
        richJson: null,
        colorToken: null,
        fontVariant: null,
        fontWeight: null,
      },
    ])

    const result = await getAdminBlocksForPage('home', 'inner')
    const hiddenBlock = result.find((block) => block.key === 'hero.description')

    expect(hiddenBlock).toMatchObject({
      key: 'hero.description',
      text: '',
      rawText: '',
      effectiveText: '',
      valueSource: 'override',
      isInherited: false,
    })
  })
})
