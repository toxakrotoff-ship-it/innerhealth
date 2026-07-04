import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLdWithOverrides,
  isSchemaOrgEnabled,
} from '@/lib/schema-org'

describe('isSchemaOrgEnabled', () => {
  it('defaults to enabled when the setting is missing', () => {
    expect(isSchemaOrgEnabled({})).toBe(true)
  })

  it('respects explicit disable values', () => {
    expect(isSchemaOrgEnabled({ schema_org_enabled: '0' })).toBe(false)
    expect(isSchemaOrgEnabled({ schema_org_enabled: 'false' })).toBe(false)
    expect(isSchemaOrgEnabled({ schema_org_enabled: 'no' })).toBe(false)
  })

  it('respects explicit enable values', () => {
    expect(isSchemaOrgEnabled({ schema_org_enabled: '1' })).toBe(true)
    expect(isSchemaOrgEnabled({ schema_org_enabled: 'true' })).toBe(true)
  })
})

describe('buildOrganizationJsonLd', () => {
  it('builds minimal organization JSON-LD from brand overrides by default', () => {
    const jsonLd = buildOrganizationJsonLd(
      {},
      {
        name: 'Inner Health',
        url: 'https://innerhealth.ru',
        logo: 'https://innerhealth.ru/hero-portrait.png',
        telephone: '+7 (989) 103-91-92',
      }
    )

    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Inner Health',
      url: 'https://innerhealth.ru',
      logo: 'https://innerhealth.ru/hero-portrait.png',
      telephone: '+7 (989) 103-91-92',
    })
  })

  it('returns null when schema.org is explicitly disabled', () => {
    const jsonLd = buildOrganizationJsonLd(
      { schema_org_enabled: '0' },
      {
        name: 'Inner Health',
        url: 'https://innerhealth.ru',
      }
    )

    expect(jsonLd).toBeNull()
  })

  it('returns null when name or url is missing', () => {
    expect(buildOrganizationJsonLd({}, { name: 'Inner Health' })).toBeNull()
    expect(buildOrganizationJsonLd({}, { url: 'https://innerhealth.ru' })).toBeNull()
  })
})

describe('buildWebSiteJsonLdWithOverrides', () => {
  it('builds WebSite JSON-LD with search action from brand overrides', () => {
    const jsonLd = buildWebSiteJsonLdWithOverrides(
      {},
      {
        name: 'Inner Health',
        url: 'https://innerhealth.ru',
      }
    )

    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Inner Health',
      url: 'https://innerhealth.ru',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://innerhealth.ru/catalog?q={search_term_string}',
        },
      },
    })
  })
})
