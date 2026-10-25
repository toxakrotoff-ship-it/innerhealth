import { NextResponse } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encryptSettingValue } from '@/lib/settings-encryption'
import { GET, PUT } from './route'

const mocks = vi.hoisted(() => ({ admin: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), transaction: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/require-admin', () => ({ requireAdminSession: mocks.admin }))
vi.mock('@/lib/prisma', () => ({ prisma: { siteSetting: { findMany: mocks.findMany, upsert: mocks.upsert }, $transaction: mocks.transaction } }))

const storage = new Map<string, string>()
type Write = { where: { key: string }; update: { value: string } }
const request = (body: unknown, brand = '') => new Request(`http://localhost/api/admin/ozon-delivery/settings${brand ? `?brand=${brand}` : ''}`, {
  method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

describe('Ozon admin settings route', () => {
  beforeEach(() => {
    vi.resetAllMocks(); storage.clear()
    vi.stubEnv('SETTINGS_ENCRYPTION_KEY', Buffer.alloc(32, 9).toString('base64'))
    mocks.admin.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN' } })
    mocks.findMany.mockImplementation(async ({ where }: { where: { key: { in: string[] } } }) => where.key.in.filter(key => storage.has(key)).map(key => ({ key, value: storage.get(key)! })))
    mocks.upsert.mockImplementation((write: Write) => write)
    mocks.transaction.mockImplementation(async (writes: Write[]) => { for (const write of writes) storage.set(write.where.key, write.update.value); return writes })
  })
  afterEach(() => vi.unstubAllEnvs())

  it.each([401, 403])('guards reads and writes with admin authorization (%s)', async status => {
    mocks.admin.mockResolvedValue(NextResponse.json({ error: 'Denied' }, { status }))
    expect((await GET(new Request('http://localhost/api/admin/ozon-delivery/settings'))).status).toBe(status)
    expect((await PUT(request({ settings: { ozon_enabled: '0' } }))).status).toBe(status)
    expect(mocks.findMany).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('returns selected brand settings with secret presence and no secret value', async () => {
    storage.set('ozon_client_secret', encryptSettingValue('global-secret'))
    storage.set('sprint-power:ozon_client_secret', encryptSettingValue('sprint-private-secret'))
    storage.set('sprint-power:ozon_enabled', '1')
    const response = await GET(new Request('http://localhost/api/admin/ozon-delivery/settings?brand=sprint-power'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const text = await response.text()
    expect(JSON.parse(text)).toMatchObject({ settings: { ozon_enabled: '1', ozon_client_secret: '' }, hasClientSecret: true })
    expect(text).not.toContain('sprint-private-secret')
    expect(text).not.toContain('global-secret')
  })

  it('keeps scoped saves isolated and preserves a secret on blank form input', async () => {
    storage.set('inner:ozon_client_secret', encryptSettingValue('saved-secret'))
    const previousSecret = storage.get('inner:ozon_client_secret')
    const response = await PUT(request({ settings: { ozon_enabled: '0', ozon_client_secret: '', ozon_client_id: ' updated-client ' } }, 'inner'))
    expect(response.status).toBe(200)
    expect(storage.get('inner:ozon_client_secret')).toBe(previousSecret)
    expect([...storage.keys()]).toEqual(['inner:ozon_client_secret', 'inner:ozon_enabled', 'inner:ozon_client_id'])
    expect(await response.json()).toMatchObject({ settings: { ozon_client_id: 'updated-client', ozon_client_secret: '' }, hasClientSecret: true })
  })

  it('applies Global configuration to both storefronts in one transaction', async () => {
    const response = await PUT(request({ settings: { ozon_enabled: '0', ozon_client_id: 'shared-client', ozon_client_secret: 'shared-secret', ozon_shipment_method_id: '42', ozon_handling_hours: '48' }, applyToBoth: true }))
    expect(response.status).toBe(200)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.transaction.mock.calls[0][0]).toHaveLength(15)
    expect(storage.get('ozon_handling_hours')).toBe('48')
    expect(storage.get('inner:ozon_handling_hours')).toBe('48')
    expect(storage.get('sprint-power:ozon_handling_hours')).toBe('48')
    expect(await response.text()).not.toContain('shared-secret')
  })

  it.each(['inner', 'sprint-power'])('rejects applying both storefronts from the %s scope', async brand => {
    expect((await PUT(request({ settings: { ozon_enabled: '0' }, applyToBoth: true }, brand))).status).toBe(400)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('rejects unknown brand scopes for both reads and writes', async () => {
    expect((await GET(new Request('http://localhost/api/admin/ozon-delivery/settings?brand=invalid'))).status).toBe(400)
    expect((await PUT(request({ settings: { ozon_enabled: '0' } }, 'invalid'))).status).toBe(400)
    expect(mocks.findMany).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it.each([
    { settings: { ozon_enabled: true } },
    { settings: { ozon_enabled: 'true' } },
    { settings: { ozon_shipment_method_id: '-1' } },
    { settings: { ozon_shipment_method_id: '1e3' } },
    { settings: { ozon_handling_hours: '169' } },
    { settings: { ozon_handling_hours: 'NaN' } },
    { settings: { ozon_client_secret: 123 } },
    { settings: { cdek_api_key: 'unrelated' } },
    { settings: { ozon_enabled: '0' }, unknown: true },
  ])('rejects malformed or unrelated fields before storing: %j', async body => {
    expect((await PUT(request(body))).status).toBe(400)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    const response = await PUT(new Request('http://localhost/api/admin/ozon-delivery/settings', { method: 'PUT', body: '{' }))
    expect(response.status).toBe(400)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('rejects enabling without required connection settings', async () => {
    const response = await PUT(request({ settings: { ozon_enabled: '1' } }, 'inner'))
    expect(response.status).toBe(400)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('redacts unexpected persistence errors', async () => {
    mocks.transaction.mockRejectedValue(new Error('connection failed private-secret'))
    const response = await PUT(request({ settings: { ozon_enabled: '0' } }))
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('private-secret')
  })
})
