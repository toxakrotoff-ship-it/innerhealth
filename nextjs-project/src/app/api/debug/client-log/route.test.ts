import { describe, expect, it, vi } from 'vitest'
import { POST } from './route'

describe('POST /api/debug/client-log', () => {
  it('accepts warn events and returns ok', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const request = new Request('http://localhost/api/debug/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test-session',
        path: '/cart',
        events: [
          {
            scope: 'cart',
            event: 'checkout_validation_failed',
            level: 'warn',
            data: { reason: 'missing_city_code' },
          },
        ],
      }),
    })

    const response = await POST(request)
    const json = (await response.json()) as { ok: boolean }

    expect(response.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('rejects invalid payload', async () => {
    const request = new Request('http://localhost/api/debug/client-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
