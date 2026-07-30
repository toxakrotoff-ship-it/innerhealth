import { describe, expect, it } from 'vitest'
import {
  resolveAdminBrandFromRequest,
  resolveBrandOrDefaultFromRequest,
} from '@/lib/brand/brand-request'

describe('resolveBrandOrDefaultFromRequest', () => {
  it('locks to host on branded domain even if query asks for another brand', () => {
    const req = new Request(
      'https://innerhealth.example/catalog?brand=sprint-power',
      { headers: { host: 'innerhealth.example' } }
    )
    expect(resolveBrandOrDefaultFromRequest(req)).toBe('inner')
  })

  it('allows query on ambiguous host', () => {
    const req = new Request('http://localhost:3000/api/x?brand=sprint-power', {
      headers: { host: 'localhost:3000' },
    })
    expect(resolveBrandOrDefaultFromRequest(req)).toBe('sprint-power')
  })
})

describe('resolveAdminBrandFromRequest', () => {
  it('prefers brand query over host-locked Inner admin domain', () => {
    const req = new Request(
      'https://innerhealth.example/api/admin/content-blocks?page=about&brand=sprint-power',
      { headers: { host: 'innerhealth.example' } }
    )
    expect(resolveAdminBrandFromRequest(req)).toBe('sprint-power')
  })

  it('prefers brand query over X-Brand from sprint storefront host', () => {
    const req = new Request(
      'https://sprintpower.example/api/admin/content-blocks?page=about&brand=inner',
      {
        headers: {
          host: 'sprintpower.example',
          'x-brand': 'sprint-power',
        },
      }
    )
    expect(resolveAdminBrandFromRequest(req)).toBe('inner')
  })

  it('falls back to active brand cookie when query is absent', () => {
    const req = new Request('https://innerhealth.example/api/admin/content-blocks?page=about', {
      headers: {
        host: 'innerhealth.example',
        cookie: 'ih_active_brand=sprint-power',
      },
    })
    expect(resolveAdminBrandFromRequest(req)).toBe('sprint-power')
  })
})
