import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/require-admin', () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } }),
}))

vi.mock('@/lib/brand/brand-request', () => ({
  resolveAdminBrandFromRequest: vi.fn(),
}))

const listSessionsForAdminMock = vi.fn()

vi.mock('@/services/checkout-session.service', () => ({
  listSessionsForAdmin: (...args: unknown[]) => listSessionsForAdminMock(...args),
}))

const { resolveAdminBrandFromRequest } = await import('@/lib/brand/brand-request')
const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  listSessionsForAdminMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 })
})

describe('GET /api/admin/checkout-sessions', () => {
  it('resolves the brand from the request and passes it through (storefront isolation)', async () => {
    vi.mocked(resolveAdminBrandFromRequest).mockReturnValue('sprint-power')

    await GET(new Request('http://x/api/admin/checkout-sessions'))

    expect(listSessionsForAdminMock).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'sprint-power' })
    )
  })

  it('cannot be overridden by an admin-supplied brand that resolveAdminBrandFromRequest already rejected', async () => {
    // resolveAdminBrandFromRequest is the single source of truth for brand — the route
    // must not read `?brand` itself and bypass it.
    vi.mocked(resolveAdminBrandFromRequest).mockReturnValue('inner')

    await GET(new Request('http://x/api/admin/checkout-sessions?brand=sprint-power'))

    expect(listSessionsForAdminMock).toHaveBeenCalledWith(expect.objectContaining({ brand: 'inner' }))
  })

  it('parses status/step filters as arrays', async () => {
    vi.mocked(resolveAdminBrandFromRequest).mockReturnValue('inner')

    await GET(
      new Request('http://x/api/admin/checkout-sessions?status=ACTIVE,ABANDONED&step=CART,CONTACT')
    )

    expect(listSessionsForAdminMock).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['ACTIVE', 'ABANDONED'], steps: ['CART', 'CONTACT'] })
    )
  })

  it('returns 400 for a malformed page number', async () => {
    vi.mocked(resolveAdminBrandFromRequest).mockReturnValue('inner')

    const res = await GET(new Request('http://x/api/admin/checkout-sessions?page=0'))

    expect(res.status).toBe(400)
    expect(listSessionsForAdminMock).not.toHaveBeenCalled()
  })
})
