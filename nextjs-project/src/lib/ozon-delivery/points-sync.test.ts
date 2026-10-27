import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ config: vi.fn(), client: vi.fn(), list: vi.fn(), info: vi.fn(), write: vi.fn(), prune: vi.fn(), cleanup: vi.fn() }))
vi.mock('./config', () => ({ getOzonDeliveryConfig: mocks.config }))
vi.mock('./client', async importOriginal => ({ ...await importOriginal<typeof import('./client')>(), getOzonDeliveryClient: mocks.client }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  $executeRaw: mocks.write, ozonDeliveryPointCache: { deleteMany: mocks.prune }, ozonDeliveryQuote: { deleteMany: mocks.cleanup },
} }))
import { syncOzonDeliveryPoints } from './points-sync'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.config.mockReturnValue({ shipmentMethodId: 1 })
  mocks.client.mockReturnValue({ listDeliveryPoints: mocks.list, getDeliveryPoints: mocks.info })
  mocks.write.mockResolvedValue(1)
})
describe('Ozon point synchronization', () => {
  it('skips disabled brands', async () => {
    mocks.config.mockReturnValue(null); mocks.client.mockReturnValue(null)
    expect(await syncOzonDeliveryPoints('inner')).toEqual({ brand: 'inner', skipped: true, points: 0 })
    expect(mocks.list).not.toHaveBeenCalled()
  })
  it('loads every page and only active PVZ reachable by the configured method', async () => {
    mocks.list.mockResolvedValueOnce({ delivery_points: [{ delivery_point_id: 1, shipment_method_ids: [1] }, { delivery_point_id: 2, shipment_method_ids: 2 }], next_cursor: 'next' })
      .mockResolvedValueOnce({ delivery_points: [{ delivery_point_id: 3, shipment_method_ids: 1 }, { delivery_point_id: 4, shipment_method_ids: 1 }], next_cursor: null })
    mocks.info.mockResolvedValueOnce({ delivery_points: [{ delivery_point_id: 1, name: 'Москва', full_address: 'Москва, улица', is_active: true, type: 'pvz' }] })
      .mockResolvedValueOnce({ delivery_points: [{ delivery_point_id: 3, is_active: false, type: 'pvz' }, { delivery_point_id: 4, is_active: true, type: 'postamat' }] })
    expect(await syncOzonDeliveryPoints('inner')).toEqual({ brand: 'inner', skipped: false, points: 1 })
    expect(mocks.list.mock.calls).toEqual([[undefined], ['next']])
    expect(mocks.info.mock.calls).toEqual([[[1]], [[3, 4]]])
    expect(mocks.write).toHaveBeenCalledTimes(1)
    expect(mocks.write.mock.calls[0][1]).toBe('inner')
    expect(mocks.write.mock.calls[0][2]).toBeInstanceOf(Date)
    expect(JSON.parse(mocks.write.mock.calls[0][3])).toEqual([{ pointId: '1', name: 'Москва', address: 'Москва, улица' }])
    expect(mocks.prune).toHaveBeenCalledTimes(1)
  })
  it('keeps the previous cache on upstream failure and repeated cursors', async () => {
    mocks.list.mockRejectedValueOnce(new Error('upstream'))
    await expect(syncOzonDeliveryPoints('inner')).rejects.toThrow()
    expect(mocks.prune).not.toHaveBeenCalled()
    mocks.list.mockResolvedValue({ delivery_points: [], next_cursor: 'same' })
    await expect(syncOzonDeliveryPoints('inner')).rejects.toThrow('repeated')
    expect(mocks.prune).not.toHaveBeenCalled()
  })
  it('splits a large list page into info requests of at most 100 and includes the final partial batch', async () => {
    const ids = Array.from({ length: 205 }, (_, index) => index + 1)
    mocks.list.mockResolvedValue({ delivery_points: ids.map(id => ({ delivery_point_id: id, shipment_method_ids: [1] })) })
    mocks.info.mockImplementation(async (batch: number[]) => {
      if (batch.length > 100) throw new Error('Ozon info batch exceeds 100')
      return { delivery_points: batch.map(id => ({ delivery_point_id: id, name: 'Point', full_address: 'Address', is_active: true, type: 'pvz' })) }
    })
    expect(await syncOzonDeliveryPoints('inner')).toEqual({ brand: 'inner', skipped: false, points: 205 })
    expect(mocks.info.mock.calls.map(([batch]) => batch.length)).toEqual([100, 100, 5])
    expect(mocks.info.mock.calls.flatMap(([batch]) => batch)).toEqual(ids)
    expect(mocks.write).toHaveBeenCalledTimes(3)
    expect(mocks.write.mock.calls.map(call => JSON.parse(call[3]).length)).toEqual([100, 100, 5])
    expect(mocks.prune).toHaveBeenCalledTimes(1)
  })
  it('does not prune the previous cache when a later detail batch fails or omits points', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => index + 1)
    mocks.list.mockResolvedValue({ delivery_points: ids.map(id => ({ delivery_point_id: id, shipment_method_ids: [1] })) })
    const firstBatch = { delivery_points: ids.slice(0, 100).map(id => ({ delivery_point_id: id, is_active: true, type: 'pvz' })) }
    mocks.info.mockResolvedValueOnce(firstBatch).mockRejectedValueOnce(new Error('upstream'))
    await expect(syncOzonDeliveryPoints('inner')).rejects.toThrow('upstream')
    expect(mocks.prune).not.toHaveBeenCalled()
    expect(mocks.cleanup).not.toHaveBeenCalled()
    mocks.info.mockResolvedValueOnce(firstBatch).mockResolvedValueOnce({ delivery_points: [] })
    await expect(syncOzonDeliveryPoints('inner')).rejects.toThrow('incomplete')
    expect(mocks.prune).not.toHaveBeenCalled()
    expect(mocks.cleanup).not.toHaveBeenCalled()
  })
  it('does not prune when point info omits a requested point', async () => {
    mocks.list.mockResolvedValue({ delivery_points: [{ delivery_point_id: 1, shipment_method_ids: 1 }] })
    mocks.info.mockResolvedValue({ delivery_points: [] })
    await expect(syncOzonDeliveryPoints('inner')).rejects.toThrow('incomplete')
    expect(mocks.prune).not.toHaveBeenCalled()
  })
  it('keeps point text in SQL parameters and does not prune on a failed cache write', async () => {
    const name = "Point's name"
    const address = 'Street \\ building "1"'
    mocks.list.mockResolvedValue({ delivery_points: [{ delivery_point_id: 1, shipment_method_ids: 1 }] })
    mocks.info.mockResolvedValue({ delivery_points: [{ delivery_point_id: 1, name, full_address: address, is_active: true, type: 'pvz' }] })
    mocks.write.mockRejectedValue(new Error('database unavailable'))
    await expect(syncOzonDeliveryPoints('sprint-power')).rejects.toThrow('database unavailable')
    const [sql, brand, , records] = mocks.write.mock.calls[0]
    expect(brand).toBe('sprint-power')
    expect(JSON.parse(records)).toEqual([{ pointId: '1', name, address }])
    expect(sql.join('')).not.toContain(name)
    expect(sql.join('')).not.toContain(address)
    expect(mocks.prune).not.toHaveBeenCalled()
    expect(mocks.cleanup).not.toHaveBeenCalled()
  })
})
