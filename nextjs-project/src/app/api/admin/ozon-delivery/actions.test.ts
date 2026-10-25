import { NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as check } from './check/route'
import { POST as sync } from './points-sync/route'

const mocks = vi.hoisted(() => ({ admin: vi.fn(), client: vi.fn(), list: vi.fn(), sync: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/require-admin', () => ({ requireAdminSession: mocks.admin }))
vi.mock('@/lib/ozon-delivery/client', () => ({ getOzonDeliveryClient: mocks.client }))
vi.mock('@/lib/ozon-delivery/points-sync', () => ({ syncOzonDeliveryPoints: mocks.sync }))
vi.mock('@/lib/ozon-delivery/settings', () => ({ OzonSettingsError: class extends Error {} }))
const request = (action: string, brand = '') => new Request(`http://localhost/api/admin/ozon-delivery/${action}${brand ? `?brand=${brand}` : ''}`, { method: 'POST' })

describe('Ozon admin connection check and point synchronization', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.admin.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } })
    mocks.client.mockResolvedValue({ listDeliveryPoints: mocks.list })
    mocks.list.mockResolvedValue({ delivery_points: [] })
    mocks.sync.mockImplementation(async brand => ({ brand, points: 2 }))
  })

  it.each([401, 403])('guards check and sync operations (%s)', async status => {
    mocks.admin.mockResolvedValue(NextResponse.json({ error: 'Denied' }, { status }))
    expect((await check(request('check', 'inner'))).status).toBe(status)
    expect((await sync(request('points-sync', 'inner'))).status).toBe(status)
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it.each([null, 'inner', 'sprint-power'] as const)('checks the saved connection in scope %s while checkout is disabled', async brand => {
    const response = await check(request('check', brand ?? ''))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(mocks.client).toHaveBeenCalledWith(brand, { includeDisabled: true })
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(await response.json()).toEqual({ ok: true })
  })

  it.each(['inner', 'sprint-power'])('synchronizes only the selected %s storefront and supports a disabled switch', async brand => {
    const response = await sync(request('points-sync', brand))
    expect(response.status).toBe(200)
    expect(mocks.sync).toHaveBeenCalledExactlyOnceWith(brand, { includeDisabled: true })
    expect(await response.json()).toEqual({ ok: true, results: [{ brand, points: 2 }] })
  })

  it('synchronizes both storefronts from Global', async () => {
    const response = await sync(request('points-sync'))
    expect(response.status).toBe(200)
    expect(mocks.sync.mock.calls).toEqual([['inner', { includeDisabled: true }], ['sprint-power', { includeDisabled: true }]])
    expect(await response.json()).toEqual({ ok: true, results: [{ brand: 'inner', points: 2 }, { brand: 'sprint-power', points: 2 }] })
  })

  it('rejects unknown scopes before contacting Ozon', async () => {
    expect((await check(request('check', 'unknown'))).status).toBe(400)
    expect((await sync(request('points-sync', 'unknown'))).status).toBe(400)
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('returns a failed check instead of success for rejected provider authorization and redacts credentials', async () => {
    mocks.list.mockRejectedValue(new Error('client secret rejected private-secret'))
    const response = await check(request('check', 'inner'))
    expect(response.status).toBe(502)
    const body = await response.text()
    expect(JSON.parse(body).ok).toBe(false)
    expect(body).not.toContain('private-secret')
  })

  it('returns a failed synchronization instead of success and redacts upstream errors', async () => {
    mocks.sync.mockRejectedValue(new Error('upstream leaked private-secret'))
    const response = await sync(request('points-sync', 'inner'))
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('private-secret')
  })
})
