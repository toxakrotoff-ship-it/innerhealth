import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from './route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/require-admin', () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ user: { id: 'admin1' } }),
}))

vi.mock('@/services/user.service', () => ({
  updateAdminInfraAlertsEnabled: vi.fn().mockResolvedValue({ updated: true }),
}))

const userService = await import('@/services/user.service')

describe('PATCH /api/admin/settings/telegram', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid payload', async () => {
    const res = await PATCH(
      new Request('http://x/api/admin/settings/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u1' }),
      })
    )
    expect(res.status).toBe(400)
  })

  it('updates infraAlertsEnabled for admin user', async () => {
    const res = await PATCH(
      new Request('http://x/api/admin/settings/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u1', infraAlertsEnabled: true }),
      })
    )
    expect(res.status).toBe(200)
    expect(vi.mocked(userService.updateAdminInfraAlertsEnabled)).toHaveBeenCalledWith({
      userId: 'u1',
      infraAlertsEnabled: true,
    })
  })
})

