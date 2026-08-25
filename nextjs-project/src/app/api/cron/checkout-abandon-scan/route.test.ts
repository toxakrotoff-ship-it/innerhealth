import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const scanAndMarkAbandonedCheckoutsMock = vi.fn()

vi.mock('@/lib/checkout-abandon-scan-service', () => ({
  DEFAULT_CHECKOUT_ABANDON_TIMEOUT_MINUTES: 60,
  scanAndMarkAbandonedCheckouts: (...args: unknown[]) => scanAndMarkAbandonedCheckoutsMock(...args),
}))

const { POST } = await import('@/app/api/cron/checkout-abandon-scan/route')

const originalToken = process.env.CHECKOUT_ABANDON_SCAN_TOKEN
const originalTimeout = process.env.CHECKOUT_ABANDON_TIMEOUT_MINUTES

function makeRequest(url: string, token?: string) {
  return new Request(url, {
    method: 'POST',
    headers: token ? { 'x-cron-token': token } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CHECKOUT_ABANDON_SCAN_TOKEN = 'test-token'
  delete process.env.CHECKOUT_ABANDON_TIMEOUT_MINUTES
  scanAndMarkAbandonedCheckoutsMock.mockResolvedValue({ scanned: 3, markedAbandoned: 2 })
})

afterEach(() => {
  process.env.CHECKOUT_ABANDON_SCAN_TOKEN = originalToken
  process.env.CHECKOUT_ABANDON_TIMEOUT_MINUTES = originalTimeout
})

describe('POST /api/cron/checkout-abandon-scan', () => {
  it('returns 500 when the cron token is not configured', async () => {
    delete process.env.CHECKOUT_ABANDON_SCAN_TOKEN
    const res = await POST(makeRequest('http://x/api/cron/checkout-abandon-scan', 'anything'))
    expect(res.status).toBe(500)
    expect(scanAndMarkAbandonedCheckoutsMock).not.toHaveBeenCalled()
  })

  it('returns 401 without a matching x-cron-token', async () => {
    const res = await POST(makeRequest('http://x/api/cron/checkout-abandon-scan', 'wrong-token'))
    expect(res.status).toBe(401)
    expect(scanAndMarkAbandonedCheckoutsMock).not.toHaveBeenCalled()
  })

  it('returns 401 without any x-cron-token', async () => {
    const res = await POST(makeRequest('http://x/api/cron/checkout-abandon-scan'))
    expect(res.status).toBe(401)
  })

  it('runs the scan with the default timeout when authorized', async () => {
    const res = await POST(makeRequest('http://x/api/cron/checkout-abandon-scan', 'test-token'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, olderThanMinutes: 60, scanned: 3, markedAbandoned: 2 })
    expect(scanAndMarkAbandonedCheckoutsMock).toHaveBeenCalledWith({
      olderThanMinutes: 60,
      batchSize: undefined,
    })
  })

  it('honors an explicit ?minutes= query override', async () => {
    const res = await POST(
      makeRequest('http://x/api/cron/checkout-abandon-scan?minutes=30&take=100', 'test-token')
    )
    expect(res.status).toBe(200)
    expect(scanAndMarkAbandonedCheckoutsMock).toHaveBeenCalledWith({
      olderThanMinutes: 30,
      batchSize: 100,
    })
  })

  it('falls back to CHECKOUT_ABANDON_TIMEOUT_MINUTES env when no query override is given', async () => {
    process.env.CHECKOUT_ABANDON_TIMEOUT_MINUTES = '45'
    const res = await POST(makeRequest('http://x/api/cron/checkout-abandon-scan', 'test-token'))
    expect(res.status).toBe(200)
    expect(scanAndMarkAbandonedCheckoutsMock).toHaveBeenCalledWith({
      olderThanMinutes: 45,
      batchSize: undefined,
    })
  })
})
