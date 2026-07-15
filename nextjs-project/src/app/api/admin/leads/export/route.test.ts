import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/require-admin', () => ({
  requireAdminSession: vi.fn(async () => ({ user: { id: 'admin' } })),
}))

vi.mock('@/lib/brand/brand-request', () => ({
  resolveAdminBrandFromRequest: vi.fn(() => 'inner'),
}))

vi.mock('@/services/leads-export.service', () => ({
  getAllLeadsForExport: vi.fn(async () => []),
  buildLeadsCsv: vi.fn(() => 'Источник\r\n'),
}))

import { GET } from './route'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { getAllLeadsForExport } from '@/services/leads-export.service'

describe('GET /api/admin/leads/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveAdminBrandFromRequest).mockReturnValue('inner')
  })

  it('uses admin brand resolution for scoped exports', async () => {
    vi.mocked(resolveAdminBrandFromRequest).mockReturnValue('sprint-power')

    const response = await GET(
      new Request('http://localhost/api/admin/leads/export?preset=all', {
        headers: {
          cookie: 'ih_active_brand=sprint-power',
        },
      })
    )

    expect(response.status).toBe(200)
    expect(resolveAdminBrandFromRequest).toHaveBeenCalledTimes(1)
    expect(getAllLeadsForExport).toHaveBeenCalledWith(undefined, 'sprint-power')
  })

  it('ignores brand resolution when all storefronts are requested', async () => {
    const response = await GET(
      new Request('http://localhost/api/admin/leads/export?allBrands=1&preset=all')
    )

    expect(response.status).toBe(200)
    expect(resolveAdminBrandFromRequest).not.toHaveBeenCalled()
    expect(getAllLeadsForExport).toHaveBeenCalledWith(undefined, 'all')
  })
})
