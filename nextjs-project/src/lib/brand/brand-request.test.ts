import { describe, expect, it } from 'vitest'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

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
