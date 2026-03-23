import { describe, expect, it } from 'vitest'
import { detectAnalyticsDeviceType } from './device-type'

describe('detectAnalyticsDeviceType', () => {
  it('classifies iPhone as mobile', () => {
    expect(
      detectAnalyticsDeviceType({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        innerWidth: 390,
      })
    ).toBe('mobile')
  })

  it('classifies iPad (explicit UA) as tablet', () => {
    expect(
      detectAnalyticsDeviceType({
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        innerWidth: 1024,
      })
    ).toBe('tablet')
  })

  it('classifies iPadOS Safari (Macintosh + touch) as tablet', () => {
    expect(
      detectAnalyticsDeviceType({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        maxTouchPoints: 5,
        innerWidth: 1200,
      })
    ).toBe('tablet')
  })

  it('classifies desktop Chrome on wide viewport', () => {
    expect(
      detectAnalyticsDeviceType({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        maxTouchPoints: 0,
        innerWidth: 1920,
      })
    ).toBe('desktop')
  })

  it('uses viewport fallback for unknown UA at narrow width', () => {
    expect(
      detectAnalyticsDeviceType({
        userAgent: 'SomeBot/1.0',
        maxTouchPoints: 0,
        innerWidth: 400,
      })
    ).toBe('mobile')
  })
})
