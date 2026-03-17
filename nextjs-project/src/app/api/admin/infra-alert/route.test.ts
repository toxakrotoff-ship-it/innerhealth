import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/telegram-notify', () => ({
  notifyTelegramInfraAlert: vi.fn().mockResolvedValue(undefined),
}))

const telegramNotify = await import('@/lib/telegram-notify')

describe('POST /api/admin/infra-alert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.INFRA_ALERT_TOKEN = 'secret'
  })

  it('returns 401 if token is missing', async () => {
    const res = await POST(
      new Request('http://x/api/admin/infra-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'disk', severity: 'warn', message: 'x' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('returns 401 if token is invalid', async () => {
    const res = await POST(
      new Request('http://x/api/admin/infra-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-infra-alert-token': 'wrong',
        },
        body: JSON.stringify({ kind: 'disk', severity: 'warn', message: 'x' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 if payload is invalid', async () => {
    const res = await POST(
      new Request('http://x/api/admin/infra-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-infra-alert-token': 'secret',
        },
        body: JSON.stringify({ kind: 'disk', severity: 'warn' }),
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 200 and triggers notifier for valid token and payload', async () => {
    const res = await POST(
      new Request('http://x/api/admin/infra-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-infra-alert-token': 'secret',
        },
        body: JSON.stringify({ kind: 'cpu', severity: 'critical', message: 'CPU high' }),
      })
    )
    expect(res.status).toBe(200)
    expect(vi.mocked(telegramNotify.notifyTelegramInfraAlert)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(telegramNotify.notifyTelegramInfraAlert)).toHaveBeenCalledWith({
      kind: 'cpu',
      severity: 'critical',
      message: 'CPU high',
    })
  })
})

