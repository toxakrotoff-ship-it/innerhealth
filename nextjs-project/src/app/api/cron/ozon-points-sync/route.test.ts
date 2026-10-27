import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ sync: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/ozon-delivery/points-sync', () => ({ syncOzonDeliveryPoints: mocks.sync }))
import { POST } from './route'
const request = (token?: string) => new Request('http://localhost/api/cron/ozon-points-sync', { method: 'POST', headers: token ? { 'x-cron-token': token } : {} })
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('OZON_POINTS_SYNC_TOKEN', 'test-secret'); mocks.sync.mockImplementation(async brand => ({ brand, points: 1, skipped: false })) })
afterEach(() => vi.unstubAllEnvs())
describe('scheduled Ozon cache refresh', () => {
  it('requires the configured token', async () => {
    expect((await POST(request())).status).toBe(401)
    expect((await POST(request('wrong-secret'))).status).toBe(401)
    vi.stubEnv('OZON_POINTS_SYNC_TOKEN', '')
    expect((await POST(request('test-secret'))).status).toBe(503)
    expect(mocks.sync).not.toHaveBeenCalled()
  })
  it('refreshes both storefronts even while customer delivery is disabled', async () => {
    const response = await POST(request('test-secret'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.sync.mock.calls).toEqual([['inner', { includeDisabled: true }], ['sprint-power', { includeDisabled: true }]])
    expect((await response.json()).ok).toBe(true)
  })
  it('reports failure without returning provider details', async () => {
    mocks.sync.mockRejectedValue(new Error('private token'))
    const response = await POST(request('test-secret'))
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('private token')
  })
})
