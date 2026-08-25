import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/require-admin', () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } }),
}))

vi.mock('@/lib/brand/brand-request', () => ({
  resolveAdminBrandFromRequest: vi.fn(),
}))

const findSessionForAdminMock = vi.fn()

vi.mock('@/services/checkout-session.service', () => ({
  findSessionForAdmin: (...args: unknown[]) => findSessionForAdminMock(...args),
}))

const { resolveAdminBrandFromRequest } = await import('@/lib/brand/brand-request')
const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(resolveAdminBrandFromRequest).mockReturnValue('inner')
})

describe('GET /api/admin/checkout-sessions/[id]', () => {
  it('returns the session for a matching brand', async () => {
    findSessionForAdminMock.mockResolvedValue({ id: 'sess-1', brand: 'inner' })

    const res = await GET(new Request('http://x/api/admin/checkout-sessions/sess-1'), {
      params: Promise.resolve({ id: 'sess-1' }),
    })

    expect(res.status).toBe(200)
    expect(findSessionForAdminMock).toHaveBeenCalledWith('sess-1', 'inner')
  })

  it('returns 404 (not 403) when the session belongs to another brand — does not confirm existence', async () => {
    findSessionForAdminMock.mockResolvedValue(null)

    const res = await GET(new Request('http://x/api/admin/checkout-sessions/other-brand-session'), {
      params: Promise.resolve({ id: 'other-brand-session' }),
    })

    expect(res.status).toBe(404)
  })
})
