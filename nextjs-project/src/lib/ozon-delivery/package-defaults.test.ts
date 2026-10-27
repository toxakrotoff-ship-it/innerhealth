import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ settings: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { siteSetting: { findMany: mocks.settings } } }))
import { getOzonPackageDefaults, resolveOzonParcelLines } from './package-defaults'
import { buildOzonParcel, ozonCartFingerprint } from './parcel'

const line = { id: 'p', quantity: 2, price: 500, weight: 210, length: 135, width: 200, height: null }
beforeEach(() => { vi.resetAllMocks(); mocks.settings.mockResolvedValue([]) })

describe('Ozon package fallback shared with CDEK', () => {
  it.each(['inner', 'sprint-power'] as const)('uses %s overrides, then global numeric settings, then the common CDEK defaults', async brand => {
    mocks.settings.mockResolvedValue([
      { key: `${brand}:cdek_default_package_weight_g`, value: '350' },
      { key: 'cdek_default_package_weight_g', value: '250' },
      { key: 'cdek_default_package_length_mm', value: '150' },
      { key: `${brand}:cdek_default_package_width_mm`, value: '0' },
      { key: 'cdek_default_package_width_mm', value: '90' },
      { key: `${brand}:cdek_default_package_height_mm`, value: '-10' },
      { key: 'cdek_default_package_height_mm', value: 'invalid' },
    ])
    expect(await getOzonPackageDefaults(brand)).toEqual({ weight: 350, length: 150, width: 90, height: 15 })
    const keys = mocks.settings.mock.calls[0][0].where.key.in
    expect(keys).toHaveLength(8)
    expect(keys.every((key: string) => key.startsWith('cdek_default_package_') || key.startsWith(`${brand}:cdek_default_package_`))).toBe(true)
    expect(mocks.settings.mock.calls[0][0].select).toEqual({ key: true, value: true })
  })
  it('fills only missing or zero fields, preserves catalogue values and counts gifts and quantities', async () => {
    const gift = { ...line, id: 'gift:g:promotion', quantity: 1, weight: null, length: 0, width: 0 }
    const lines = await resolveOzonParcelLines([line, gift], 'inner')
    expect(lines[0]).toEqual({ ...line, height: 15 })
    expect(lines[1]).toEqual({ ...gift, weight: 100, length: 33, width: 25, height: 15 })
    expect(line.height).toBeNull()
    expect(gift.weight).toBeNull()
    expect(buildOzonParcel(lines)).toEqual({ weight_g: 520, length_mm: 135, width_mm: 200, height_mm: 45 })
  })
  it('reads fresh values so changes to a used fallback change the quote fingerprint', async () => {
    mocks.settings.mockResolvedValueOnce([{ key: 'inner:cdek_default_package_height_mm', value: '50' }])
      .mockResolvedValueOnce([{ key: 'inner:cdek_default_package_height_mm', value: '60' }])
    const first = await resolveOzonParcelLines([line], 'inner')
    const second = await resolveOzonParcelLines([line], 'inner')
    expect(ozonCartFingerprint(first)).not.toBe(ozonCartFingerprint(second))
    expect(mocks.settings).toHaveBeenCalledTimes(2)
  })
  it('does not read settings for complete catalogue data', async () => {
    const lines = [{ ...line, height: 40 }]
    expect(await resolveOzonParcelLines(lines, 'inner')).toBe(lines)
    expect(mocks.settings).not.toHaveBeenCalled()
  })
  it('uses the supplied transaction reader and propagates settings failures', async () => {
    const settings = vi.fn().mockResolvedValue([])
    const tx = { siteSetting: { findMany: settings } } as unknown as Parameters<typeof resolveOzonParcelLines>[2]
    await resolveOzonParcelLines([line], 'inner', tx)
    expect(settings).toHaveBeenCalledOnce()
    expect(mocks.settings).not.toHaveBeenCalled()
    mocks.settings.mockRejectedValue(new Error('db unavailable'))
    await expect(resolveOzonParcelLines([line], 'inner')).rejects.toThrow('db unavailable')
  })
  it('retains size and quantity validation after resolving missing fields', async () => {
    const lines = await resolveOzonParcelLines([{ ...line, quantity: 0 }, { ...line, length: 3000 }], 'inner')
    expect(() => buildOzonParcel(lines)).toThrow()
    expect(() => buildOzonParcel(lines.slice(1))).toThrow('габариты Ozon')
  })
})
