import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  DEFAULT_POLL_THROTTLE_TIERS,
  getThrottleIntervalForAge,
  shouldPollOrder,
} from './yookassa-sync-service'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('getThrottleIntervalForAge', () => {
  it('returns 0 (no throttle) for fresh orders (< 30 min)', () => {
    expect(getThrottleIntervalForAge(0)).toBe(0)
    expect(getThrottleIntervalForAge(15 * MINUTE)).toBe(0)
  })

  it('returns 5 min for 30 min – 6 h orders', () => {
    expect(getThrottleIntervalForAge(31 * MINUTE)).toBe(5 * MINUTE)
    expect(getThrottleIntervalForAge(2 * HOUR)).toBe(5 * MINUTE)
  })

  it('returns 15 min for 6 h – 24 h orders', () => {
    expect(getThrottleIntervalForAge(7 * HOUR)).toBe(15 * MINUTE)
    expect(getThrottleIntervalForAge(20 * HOUR)).toBe(15 * MINUTE)
  })

  it('returns 1 h for 1 d – 7 d orders', () => {
    expect(getThrottleIntervalForAge(2 * DAY)).toBe(HOUR)
    expect(getThrottleIntervalForAge(6 * DAY)).toBe(HOUR)
  })

  it('returns Infinity for orders > 7 d (do not poll)', () => {
    expect(getThrottleIntervalForAge(8 * DAY)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('shouldPollOrder', () => {
  const now = new Date('2026-05-07T10:00:00Z')

  it('polls fresh order with no previous check', () => {
    expect(
      shouldPollOrder({
        createdAt: new Date(now.getTime() - 5 * MINUTE),
        yookassaCheckedAt: null,
        now,
      })
    ).toBe(true)
  })

  it('polls fresh order even right after a check (intervalMs = 0)', () => {
    expect(
      shouldPollOrder({
        createdAt: new Date(now.getTime() - 5 * MINUTE),
        yookassaCheckedAt: new Date(now.getTime() - 1000),
        now,
      })
    ).toBe(true)
  })

  it('skips a 1-hour-old order checked 2 min ago (throttle 5 min)', () => {
    expect(
      shouldPollOrder({
        createdAt: new Date(now.getTime() - HOUR),
        yookassaCheckedAt: new Date(now.getTime() - 2 * MINUTE),
        now,
      })
    ).toBe(false)
  })

  it('polls a 1-hour-old order checked 6 min ago (throttle 5 min)', () => {
    expect(
      shouldPollOrder({
        createdAt: new Date(now.getTime() - HOUR),
        yookassaCheckedAt: new Date(now.getTime() - 6 * MINUTE),
        now,
      })
    ).toBe(true)
  })

  it('skips a 12-hour-old order checked 10 min ago (throttle 15 min)', () => {
    expect(
      shouldPollOrder({
        createdAt: new Date(now.getTime() - 12 * HOUR),
        yookassaCheckedAt: new Date(now.getTime() - 10 * MINUTE),
        now,
      })
    ).toBe(false)
  })

  it('skips an order older than 7 days (no polling tier)', () => {
    expect(
      shouldPollOrder({
        createdAt: new Date(now.getTime() - 8 * DAY),
        yookassaCheckedAt: null,
        now,
      })
    ).toBe(false)
  })

  it('uses default tiers when not provided', () => {
    expect(DEFAULT_POLL_THROTTLE_TIERS.length).toBeGreaterThan(0)
    expect(
      shouldPollOrder({
        createdAt: new Date(now.getTime() - 10 * MINUTE),
        yookassaCheckedAt: null,
        now,
      })
    ).toBe(true)
  })
})
