import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getOzonDeliveryConfig } from './config'

const mocks = vi.hoisted(() => ({ getSettingsMap: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/services/settings.service', () => ({ getSettingsMap: mocks.getSettingsMap }))

const enabledSettings = {
  ozon_enabled: '1', ozon_client_id: 'saved-client', ozon_client_secret: 'saved-secret',
  ozon_shipment_method_id: '42', ozon_handling_hours: '36',
}

describe('Ozon Delivery configuration from admin settings', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.getSettingsMap.mockResolvedValue(enabledSettings) })
  afterEach(() => vi.unstubAllEnvs())

  it.each([null, 'inner', 'sprint-power'] as const)('loads fresh settings for scope %s', async brandId => {
    await expect(getOzonDeliveryConfig(brandId)).resolves.toEqual({
      clientId: 'saved-client', clientSecret: 'saved-secret', shipmentMethodId: 42, handlingHours: 36,
    })
    expect(mocks.getSettingsMap).toHaveBeenCalledWith(expect.arrayContaining(['ozon_enabled', 'ozon_client_id', 'ozon_client_secret']), { brandId, fresh: true })
  })

  it.each(['0', 'false', '', undefined])('keeps delivery disabled for saved switch %s', async value => {
    mocks.getSettingsMap.mockResolvedValue({ ...enabledSettings, ozon_enabled: value, ozon_client_secret: '' })
    await expect(getOzonDeliveryConfig('inner')).resolves.toBeNull()
  })

  it('permits checking saved credentials while delivery is disabled', async () => {
    mocks.getSettingsMap.mockResolvedValue({ ...enabledSettings, ozon_enabled: '0' })
    await expect(getOzonDeliveryConfig('inner', { includeDisabled: true })).resolves.toMatchObject({ shipmentMethodId: 42 })
  })

  it('defaults the handling deadline to 24 hours', async () => {
    mocks.getSettingsMap.mockResolvedValue({ ...enabledSettings, ozon_handling_hours: '' })
    await expect(getOzonDeliveryConfig('inner')).resolves.toMatchObject({ handlingHours: 24 })
  })

  it('ignores obsolete environment credentials and switches', async () => {
    vi.stubEnv('OZON_ENABLED', 'true')
    vi.stubEnv('OZON_INNER_ENABLED', 'true')
    vi.stubEnv('OZON_CLIENT_ID', 'env-client')
    vi.stubEnv('OZON_CLIENT_SECRET', 'env-secret')
    vi.stubEnv('OZON_SHIPMENT_METHOD_ID', '7')
    vi.stubEnv('OZON_HANDLING_HOURS', '120')
    mocks.getSettingsMap.mockResolvedValue({})
    await expect(getOzonDeliveryConfig('inner')).resolves.toBeNull()
    mocks.getSettingsMap.mockResolvedValue(enabledSettings)
    await expect(getOzonDeliveryConfig('inner')).resolves.toEqual({
      clientId: 'saved-client', clientSecret: 'saved-secret', shipmentMethodId: 42, handlingHours: 36,
    })
  })

  it.each(['0', '-1', '1.2', '1e3', '9007199254740992', ''])('rejects invalid shipment method %s without exposing credentials', async method => {
    mocks.getSettingsMap.mockResolvedValue({ ...enabledSettings, ozon_shipment_method_id: method })
    const error = await getOzonDeliveryConfig('inner').catch(error => error)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('ID метода доставки')
    expect(error.message).not.toContain('saved-secret')
    expect(error.message).not.toContain('saved-client')
  })

  it.each(['0', '-1', '169', 'Infinity', 'NaN'])('rejects invalid handling deadline %s', async hours => {
    mocks.getSettingsMap.mockResolvedValue({ ...enabledSettings, ozon_handling_hours: hours })
    await expect(getOzonDeliveryConfig('inner')).rejects.toThrow('от 1 до 168 часов')
  })

  it.each(['ozon_client_id', 'ozon_client_secret'])('requires saved %s when enabled', async key => {
    mocks.getSettingsMap.mockResolvedValue({ ...enabledSettings, [key]: '' })
    await expect(getOzonDeliveryConfig('inner')).rejects.toThrow('Client ID и Client Secret')
  })
})
