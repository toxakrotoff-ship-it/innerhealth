import { describe, it, expect, vi } from 'vitest'
import type { LeadExportRow } from '@/services/leads-export.service'

vi.mock('server-only', () => ({}))

const { buildLeadsCsv } = await import('@/services/leads-export.service')

describe('buildLeadsCsv', () => {
  it('includes storefront column in header and rows', () => {
    const rows: LeadExportRow[] = [
      {
        source: 'partnership',
        storefront: 'Inner Health',
        name: 'Test',
        email: 'a@b.ru',
        phone: '',
        address: '',
        role: '',
        messageComment: '',
        product: '',
        quantity: '',
        promoCode: '',
        delivery: '',
        tildaTranId: '',
        date: '01.01.2026, 12:00',
        id: 'id1',
      },
    ]
    const csv = buildLeadsCsv(rows)
    const lines = csv.split('\r\n')
    expect(lines[0]).toContain('Витрина')
    expect(lines[0]).toContain('Источник')
    expect(lines[1]).toContain('Inner Health')
    expect(lines[1]).toContain('partnership')
  })
})
