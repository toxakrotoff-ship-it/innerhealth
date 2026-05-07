import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/yookassa-sync-service', () => ({
  syncPendingOrdersBatch: vi.fn().mockResolvedValue({
    scanned: 0,
    skippedByThrottle: 0,
    updated: 0,
    updatedToPaid: 0,
    updatedToCanceled: 0,
    errors: 0,
    items: [],
  }),
}))

import { syncPendingOrdersBatch } from '@/lib/yookassa-sync-service'
import { POST } from '@/app/api/cron/yookassa-poll/route'

const ORIGINAL_TOKEN = process.env.YOOKASSA_POLL_TOKEN

function makeRequest(headers: Record<string, string> = {}, qs = '') {
  return new Request(`https://localhost/api/cron/yookassa-poll${qs}`, {
    method: 'POST',
    headers,
  })
}

describe('POST /api/cron/yookassa-poll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.YOOKASSA_POLL_TOKEN = 'test-token'
  })

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.YOOKASSA_POLL_TOKEN
    else process.env.YOOKASSA_POLL_TOKEN = ORIGINAL_TOKEN
  })

  it('rejects request without token', async () => {
    const response = await POST(makeRequest())
    expect(response.status).toBe(401)
    expect(syncPendingOrdersBatch).not.toHaveBeenCalled()
  })

  it('rejects request with wrong token', async () => {
    const response = await POST(makeRequest({ 'x-cron-token': 'wrong' }))
    expect(response.status).toBe(401)
    expect(syncPendingOrdersBatch).not.toHaveBeenCalled()
  })

  it('returns 500 when YOOKASSA_POLL_TOKEN env is missing', async () => {
    delete process.env.YOOKASSA_POLL_TOKEN
    const response = await POST(makeRequest({ 'x-cron-token': 'any' }))
    expect(response.status).toBe(500)
    expect(syncPendingOrdersBatch).not.toHaveBeenCalled()
  })

  it('runs sync with throttle on cron-poll source when token is valid', async () => {
    const response = await POST(makeRequest({ 'x-cron-token': 'test-token' }))
    expect(response.status).toBe(200)
    expect(syncPendingOrdersBatch).toHaveBeenCalledTimes(1)
    const opts = vi.mocked(syncPendingOrdersBatch).mock.calls[0]?.[0]
    expect(opts?.honorThrottle).toBe(true)
    expect(opts?.source).toBe('cron-poll')
    expect(opts?.brandId).toBe(null)
  })

  it('respects days/take query params with bounds', async () => {
    await POST(makeRequest({ 'x-cron-token': 'test-token' }, '?days=3&take=20'))
    const opts = vi.mocked(syncPendingOrdersBatch).mock.calls[0]?.[0]
    expect(opts?.take).toBe(20)
    // since must be ~3 days back
    const daysBack = (Date.now() - (opts?.since.getTime() ?? 0)) / (24 * 60 * 60 * 1000)
    expect(daysBack).toBeGreaterThan(2.9)
    expect(daysBack).toBeLessThan(3.1)
  })

  it('rejects out-of-bound query params', async () => {
    const response = await POST(
      makeRequest({ 'x-cron-token': 'test-token' }, '?days=999&take=99999')
    )
    expect(response.status).toBe(400)
  })
})
