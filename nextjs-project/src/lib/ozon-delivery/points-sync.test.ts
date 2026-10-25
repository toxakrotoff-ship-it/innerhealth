import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ config: vi.fn(), client: vi.fn(), list: vi.fn(), info: vi.fn(), transaction: vi.fn(), upsert: vi.fn(), prune: vi.fn(), cleanup: vi.fn() }))
vi.mock('./config', () => ({ getOzonDeliveryConfig: mocks.config }))
vi.mock('./client', () => ({ getOzonDeliveryClient: mocks.client }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  $transaction: mocks.transaction, ozonDeliveryPointCache: { upsert: mocks.upsert, deleteMany: mocks.prune }, ozonDeliveryQuote: { deleteMany: mocks.cleanup },
} }))
import { syncOzonDeliveryPoints } from './points-sync'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.config.mockReturnValue({ shipmentMethodId: 1 })
  mocks.client.mockReturnValue({ listDeliveryPoints: mocks.list, getDeliveryPoints: mocks.info })
  mocks.transaction.mockResolvedValue([])
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
    expect(mocks.upsert).toHaveBeenCalledTimes(1)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { brand_pointId: { brand: 'inner', pointId: '1' } } }))
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
  it('does not prune when point info omits a requested point', async () => {
    mocks.list.mockResolvedValue({ delivery_points: [{ delivery_point_id: 1, shipment_method_ids: 1 }] })
    mocks.info.mockResolvedValue({ delivery_points: [] })
    await expect(syncOzonDeliveryPoints('inner')).rejects.toThrow('incomplete')
    expect(mocks.prune).not.toHaveBeenCalled()
  })
})
