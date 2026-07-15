import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/require-admin', () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ user: { id: 'admin1' } }),
}))

vi.mock('@/lib/brand/brand-request', () => ({
  resolveAdminBrandFromRequest: vi.fn(() => 'inner'),
}))

vi.mock('@/services/tilda-leads.service', () => ({
  importTildaLeadsFromCsv: vi.fn().mockResolvedValue({
    upserted: 2,
    skipped: 1,
    errors: 0,
  }),
  getTildaLeads: vi.fn().mockResolvedValue([]),
}))

const brandRequest = await import('@/lib/brand/brand-request')
const tildaLeadsService = await import('@/services/tilda-leads.service')

describe('/api/admin/tilda-leads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(brandRequest.resolveAdminBrandFromRequest).mockReturnValue('inner')
  })

  it('loads leads in admin brand scope', async () => {
    vi.mocked(brandRequest.resolveAdminBrandFromRequest).mockReturnValue('sprint-power')

    const request = new Request('http://x/api/admin/tilda-leads', {
      headers: {
        cookie: 'ih_active_brand=sprint-power',
      },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(vi.mocked(tildaLeadsService.getTildaLeads)).toHaveBeenCalledWith('sprint-power')
  })

  it('returns 400 when file is missing', async () => {
    const formData = new FormData()
    const request = new Request('http://x/api/admin/tilda-leads', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('imports csv file and returns stats', async () => {
    vi.mocked(brandRequest.resolveAdminBrandFromRequest).mockReturnValue('sprint-power')

    const formData = new FormData()
    const csvFile = new File(['email;name\njohn@example.com;John'], 'leads.csv', {
      type: 'text/csv',
    })
    formData.append('file', csvFile)

    const request = new Request('http://x/api/admin/tilda-leads', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(vi.mocked(tildaLeadsService.importTildaLeadsFromCsv)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(tildaLeadsService.importTildaLeadsFromCsv)).toHaveBeenCalledWith(
      'email;name\njohn@example.com;John',
      'sprint-power'
    )

    const payload = await response.json()
    expect(payload).toEqual({ upserted: 2, skipped: 1, errors: 0 })
  })
})
