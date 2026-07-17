import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { getAdminLegalFallbackRichJson } from '@/lib/legal/legal-page-admin-fallback'

describe('getAdminLegalFallbackRichJson', () => {
  it('builds rich json fallback for privacy page', () => {
    const result = getAdminLegalFallbackRichJson('legal-privacy', 'inner')

    expect(result).not.toBeNull()
    expect(result).toMatchObject({ type: 'doc' })
    expect(JSON.stringify(result)).toContain('Политика')
    expect(JSON.stringify(result)).toContain('innerhealth@mail.ru')
    expect(JSON.stringify(result)).toContain('https://innerhealth.ru/privacy')
  })

  it('returns null for unsupported legal pages', () => {
    expect(getAdminLegalFallbackRichJson('legal-oferta', 'inner')).toBeNull()
  })
})
