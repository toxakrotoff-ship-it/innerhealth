import { describe, expect, it } from 'vitest'
import {
  extractClientIpFromForwarded,
  isYookassaIp,
  isYookassaIpFilterEnabled,
} from './yookassa-ip-allowlist'

describe('isYookassaIp', () => {
  it('matches IPv4 inside published /27 range (185.71.76.0/27)', () => {
    expect(isYookassaIp('185.71.76.0')).toBe(true)
    expect(isYookassaIp('185.71.76.31')).toBe(true)
  })

  it('rejects IPv4 just outside the /27 (185.71.76.32)', () => {
    expect(isYookassaIp('185.71.76.32')).toBe(false)
  })

  it('matches IPv4 inside 77.75.154.128/25', () => {
    expect(isYookassaIp('77.75.154.128')).toBe(true)
    expect(isYookassaIp('77.75.154.255')).toBe(true)
  })

  it('rejects 77.75.154.127 (just below 77.75.154.128/25)', () => {
    expect(isYookassaIp('77.75.154.127')).toBe(false)
  })

  it('matches the explicit single-host IPv4 entries (77.75.156.11 / .35)', () => {
    expect(isYookassaIp('77.75.156.11')).toBe(true)
    expect(isYookassaIp('77.75.156.35')).toBe(true)
    expect(isYookassaIp('77.75.156.12')).toBe(false)
  })

  it('matches IPv6 inside 2a02:5180::/32', () => {
    expect(isYookassaIp('2a02:5180::1')).toBe(true)
    expect(isYookassaIp('2a02:5180:abcd:1234::5')).toBe(true)
  })

  it('rejects unrelated IPv6 addresses', () => {
    expect(isYookassaIp('2001:db8::1')).toBe(false)
    expect(isYookassaIp('::1')).toBe(false)
  })

  it('strips brackets and IPv6 zone identifiers', () => {
    expect(isYookassaIp('[2a02:5180::1]')).toBe(true)
    expect(isYookassaIp('2a02:5180::1%eth0')).toBe(true)
  })

  it('returns false for null / empty / malformed input', () => {
    expect(isYookassaIp(null)).toBe(false)
    expect(isYookassaIp(undefined)).toBe(false)
    expect(isYookassaIp('')).toBe(false)
    expect(isYookassaIp('not-an-ip')).toBe(false)
    expect(isYookassaIp('999.999.999.999')).toBe(false)
  })
})

describe('extractClientIpFromForwarded', () => {
  it('returns the first hop and trims whitespace', () => {
    expect(extractClientIpFromForwarded('185.71.76.5, 10.0.0.1, 10.0.0.2')).toBe(
      '185.71.76.5'
    )
    expect(extractClientIpFromForwarded(' 2a02:5180::1 , 10.0.0.1')).toBe('2a02:5180::1')
  })

  it('returns null for null / empty', () => {
    expect(extractClientIpFromForwarded(null)).toBeNull()
    expect(extractClientIpFromForwarded('')).toBeNull()
    expect(extractClientIpFromForwarded(' ,, ')).toBeNull()
  })
})

describe('isYookassaIpFilterEnabled', () => {
  const originalValue = process.env.YOOKASSA_IP_FILTER

  function withEnv(value: string | undefined, fn: () => void): void {
    if (value === undefined) {
      delete process.env.YOOKASSA_IP_FILTER
    } else {
      process.env.YOOKASSA_IP_FILTER = value
    }
    try {
      fn()
    } finally {
      if (originalValue === undefined) {
        delete process.env.YOOKASSA_IP_FILTER
      } else {
        process.env.YOOKASSA_IP_FILTER = originalValue
      }
    }
  }

  it('is enabled by default (env unset)', () => {
    withEnv(undefined, () => expect(isYookassaIpFilterEnabled()).toBe(true))
  })

  it('is disabled for "off" / "false" / "0"', () => {
    withEnv('off', () => expect(isYookassaIpFilterEnabled()).toBe(false))
    withEnv('FALSE', () => expect(isYookassaIpFilterEnabled()).toBe(false))
    withEnv('0', () => expect(isYookassaIpFilterEnabled()).toBe(false))
  })

  it('is enabled for any other value', () => {
    withEnv('on', () => expect(isYookassaIpFilterEnabled()).toBe(true))
    withEnv('1', () => expect(isYookassaIpFilterEnabled()).toBe(true))
  })
})
