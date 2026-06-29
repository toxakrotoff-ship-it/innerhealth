import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('geoip-lite', () => ({
  default: {
    lookup: vi.fn(),
  },
}))

import { headers } from 'next/headers'
import geoip from 'geoip-lite'
import {
  getRequestCountryCode,
  isVpnNoticeEnabled,
  shouldShowVpnNotice,
} from './request-country'

const mockedHeaders = vi.mocked(headers)
const mockedGeoipLookup = vi.mocked(geoip.lookup)

function mockRequestHeaders(values: Record<string, string | null>): void {
  mockedHeaders.mockResolvedValue({
    get: (name: string) => values[name.toLowerCase()] ?? null,
  } as Awaited<ReturnType<typeof headers>>)
}

describe('request-country', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  describe('isVpnNoticeEnabled', () => {
    it('is enabled by default', () => {
      delete process.env.VPN_NOTICE_ENABLED
      expect(isVpnNoticeEnabled()).toBe(true)
    })

    it('can be disabled via env', () => {
      process.env.VPN_NOTICE_ENABLED = 'false'
      expect(isVpnNoticeEnabled()).toBe(false)
    })
  })

  describe('getRequestCountryCode', () => {
    it('resolves country from client IP via geoip-lite', async () => {
      process.env.NODE_ENV = 'production'
      mockRequestHeaders({
        host: 'innerhealth.ru',
        'x-forwarded-for': '8.8.8.8',
      })
      mockedGeoipLookup.mockReturnValue({
        country: 'US',
        range: [0, 0],
        region: '',
        eu: '0',
        timezone: 'America/Chicago',
        city: '',
        ll: [0, 0],
        metro: 0,
        area: 0,
      })

      await expect(getRequestCountryCode()).resolves.toBe('US')
      expect(mockedGeoipLookup).toHaveBeenCalledWith('8.8.8.8')
    })

    it('uses dev override on localhost', async () => {
      process.env.NODE_ENV = 'development'
      process.env.VPN_NOTICE_DEV_COUNTRY = 'nl'
      mockRequestHeaders({ host: 'localhost:3000' })
      await expect(getRequestCountryCode()).resolves.toBe('NL')
      expect(mockedGeoipLookup).not.toHaveBeenCalled()
    })

    it('returns null when IP is missing', async () => {
      process.env.NODE_ENV = 'production'
      mockRequestHeaders({ host: 'innerhealth.ru' })
      await expect(getRequestCountryCode()).resolves.toBeNull()
    })
  })

  describe('shouldShowVpnNotice', () => {
    it('returns false for Russian IPs', async () => {
      process.env.NODE_ENV = 'production'
      mockRequestHeaders({
        host: 'innerhealth.ru',
        'x-real-ip': '87.250.250.242',
      })
      mockedGeoipLookup.mockReturnValue({
        country: 'RU',
        range: [0, 0],
        region: '',
        eu: '0',
        timezone: 'Europe/Moscow',
        city: '',
        ll: [0, 0],
        metro: 0,
        area: 0,
      })

      await expect(shouldShowVpnNotice()).resolves.toBe(false)
    })

    it('returns true for non-Russian IPs', async () => {
      process.env.NODE_ENV = 'production'
      mockRequestHeaders({
        host: 'innerhealth.ru',
        'x-forwarded-for': '8.8.8.8',
      })
      mockedGeoipLookup.mockReturnValue({
        country: 'US',
        range: [0, 0],
        region: '',
        eu: '0',
        timezone: 'America/Chicago',
        city: '',
        ll: [0, 0],
        metro: 0,
        area: 0,
      })

      await expect(shouldShowVpnNotice()).resolves.toBe(true)
    })

    it('returns false when country is unknown', async () => {
      process.env.NODE_ENV = 'production'
      mockRequestHeaders({
        host: 'innerhealth.ru',
        'x-forwarded-for': '10.0.0.1',
      })
      mockedGeoipLookup.mockReturnValue(null)
      await expect(shouldShowVpnNotice()).resolves.toBe(false)
    })

    it('returns false when feature is disabled', async () => {
      process.env.VPN_NOTICE_ENABLED = 'off'
      process.env.NODE_ENV = 'production'
      mockRequestHeaders({
        host: 'innerhealth.ru',
        'x-forwarded-for': '8.8.8.8',
      })
      mockedGeoipLookup.mockReturnValue({
        country: 'US',
        range: [0, 0],
        region: '',
        eu: '0',
        timezone: 'America/Chicago',
        city: '',
        ll: [0, 0],
        metro: 0,
        area: 0,
      })

      await expect(shouldShowVpnNotice()).resolves.toBe(false)
    })
  })
})
