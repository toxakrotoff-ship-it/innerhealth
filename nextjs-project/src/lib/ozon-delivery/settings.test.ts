import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decryptSettingValue, encryptSettingValue, isSensitiveSettingStorageKey } from '@/lib/settings-encryption'
import { OZON_SETTING_KEYS, publicOzonSettings, readOzonSettings, saveOzonSettings } from './settings'

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), upsert: vi.fn(), transaction: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: {
  siteSetting: { findMany: mocks.findMany, upsert: mocks.upsert }, $transaction: mocks.transaction,
} }))

type Write = { where: { key: string }; create: { key: string; value: string }; update: { value: string } }
const storage = new Map<string, string>()
const complete = {
  ozon_enabled: '1', ozon_client_id: 'private-client', ozon_client_secret: 'private-secret',
  ozon_shipment_method_id: '42', ozon_handling_hours: '24',
}
function seed(values: Record<string, string>, scope: string | null = null) {
  for (const [key, value] of Object.entries(values)) storage.set(scope ? `${scope}:${key}` : key, isSensitiveSettingStorageKey(key) ? encryptSettingValue(value) : value)
}

describe('Ozon Delivery scoped admin settings', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    storage.clear()
    vi.stubEnv('SETTINGS_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64'))
    mocks.findMany.mockImplementation(async ({ where }: { where: { key: { in: string[] } } }) =>
      where.key.in.filter(key => storage.has(key)).map(key => ({ key, value: storage.get(key)! })))
    // Model Prisma's lazy operations: all writes reach storage through the transaction.
    mocks.upsert.mockImplementation((write: Write) => write)
    mocks.transaction.mockImplementation(async (writes: Write[]) => {
      for (const write of writes) storage.set(write.where.key, write.update.value)
      return writes
    })
  })
  afterEach(() => vi.unstubAllEnvs())

  it('provides disabled defaults with no configured account', async () => {
    await expect(readOzonSettings(null)).resolves.toEqual({
      ozon_enabled: '0', ozon_client_id: '', ozon_client_secret: '', ozon_shipment_method_id: '', ozon_handling_hours: '24',
    })
  })

  it('uses Global settings for both storefronts and allows independent overrides', async () => {
    seed(complete)
    seed({ ozon_enabled: '0', ozon_client_id: 'sprint-client', ozon_client_secret: 'sprint-secret', ozon_handling_hours: '48' }, 'sprint-power')
    await expect(readOzonSettings('inner')).resolves.toEqual(complete)
    await expect(readOzonSettings('sprint-power')).resolves.toEqual({ ...complete,
      ozon_enabled: '0', ozon_client_id: 'sprint-client', ozon_client_secret: 'sprint-secret', ozon_handling_hours: '48',
    })
    await expect(readOzonSettings(null)).resolves.toEqual(complete)
  })

  it('reflects a saved switch immediately even after an earlier cached read', async () => {
    seed(complete)
    await expect(readOzonSettings('inner')).resolves.toMatchObject({ ozon_enabled: '1' })
    storage.set('ozon_enabled', '0')
    await expect(readOzonSettings('inner')).resolves.toMatchObject({ ozon_enabled: '0' })
  })

  it('stores credentials encrypted only in the selected brand and masks the returned secret', async () => {
    const result = await saveOzonSettings(complete, 'inner')
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect([...storage.keys()].every(key => key.startsWith('inner:ozon_'))).toBe(true)
    for (const key of ['ozon_client_id', 'ozon_client_secret'] as const) {
      const raw = storage.get(`inner:${key}`)!
      expect(raw).toMatch(/^__enc:v1:/)
      expect(raw).not.toContain(complete[key])
      expect(decryptSettingValue(raw)).toBe(complete[key])
    }
    expect(result.settings.ozon_client_secret).toBe('')
    expect(result.hasClientSecret).toBe(true)
    expect(JSON.stringify(result)).not.toContain('private-secret')
    await expect(readOzonSettings('sprint-power')).resolves.toMatchObject({ ozon_enabled: '0', ozon_client_secret: '' })
  })

  it('saves Global changes without replacing existing brand overrides by default', async () => {
    seed(complete, 'inner')
    const before = new Map(storage)
    await saveOzonSettings({ ozon_enabled: '0' }, null)
    expect(storage.get('ozon_enabled')).toBe('0')
    for (const [key, value] of before) expect(storage.get(key)).toBe(value)
    expect(mocks.upsert).toHaveBeenCalledTimes(1)
  })

  it.each(['', '   '])('keeps a saved brand secret when the input is blank %j', async secret => {
    seed(complete, 'inner')
    const original = storage.get('inner:ozon_client_secret')
    const result = await saveOzonSettings({ ozon_client_secret: secret, ozon_handling_hours: '48' }, 'inner')
    expect(storage.get('inner:ozon_client_secret')).toBe(original)
    expect(result).toMatchObject({ settings: { ozon_client_secret: '', ozon_handling_hours: '48' }, hasClientSecret: true })
    expect(mocks.upsert.mock.calls.map(([write]) => write.where.key)).not.toContain('inner:ozon_client_secret')
  })

  it('copies the saved Global secret to both storefronts atomically without a new secret input', async () => {
    seed(complete)
    seed({ ...complete, ozon_client_secret: 'old-inner', ozon_enabled: '0' }, 'inner')
    seed({ ...complete, ozon_client_secret: 'old-sprint', ozon_enabled: '0' }, 'sprint-power')
    const result = await saveOzonSettings({ ozon_client_secret: '', ozon_handling_hours: '72' }, null, true)
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.transaction.mock.calls[0][0]).toHaveLength(OZON_SETTING_KEYS.length * 3)
    for (const scope of [null, 'inner', 'sprint-power'] as const) {
      await expect(readOzonSettings(scope)).resolves.toEqual({ ...complete, ozon_handling_hours: '72' })
      expect(decryptSettingValue(storage.get(scope ? `${scope}:ozon_client_secret` : 'ozon_client_secret')!)).toBe('private-secret')
    }
    expect(JSON.stringify(result)).not.toContain('private-secret')
  })

  it.each(['inner', 'sprint-power'] as const)('rejects copying to both while scoped to %s', async scope => {
    await expect(saveOzonSettings(complete, scope, true)).rejects.toThrow('режиме Global')
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(storage.size).toBe(0)
  })

  it.each(['ozon_client_id', 'ozon_client_secret', 'ozon_shipment_method_id'] as const)('requires %s before enabling and writes nothing on validation failure', async key => {
    const invalid = { ...complete, [key]: '' }
    await expect(saveOzonSettings(invalid, 'inner')).rejects.toThrow()
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it.each(['0', '169', 'NaN'])('rejects invalid handling hours %s before enabling', async hours => {
    await expect(saveOzonSettings({ ...complete, ozon_handling_hours: hours }, null)).rejects.toThrow('от 1 до 168 часов')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('can disable an incomplete configuration immediately', async () => {
    await expect(saveOzonSettings({ ozon_enabled: '0' }, 'inner')).resolves.toMatchObject({ settings: { ozon_enabled: '0' }, hasClientSecret: false })
  })

  it('never writes unrelated settings supplied outside the form', async () => {
    await saveOzonSettings({ ozon_enabled: '0', site_name: 'Changed elsewhere' } as Parameters<typeof saveOzonSettings>[0], 'inner')
    expect(storage.has('inner:site_name')).toBe(false)
    expect([...storage.keys()]).toEqual(['inner:ozon_enabled'])
  })

  it('returns secret presence without a secret for configured and empty accounts', () => {
    expect(publicOzonSettings(complete)).toEqual({ settings: { ...complete, ozon_client_secret: '' }, hasClientSecret: true })
    expect(publicOzonSettings({ ...complete, ozon_client_secret: '' }).hasClientSecret).toBe(false)
  })
})
