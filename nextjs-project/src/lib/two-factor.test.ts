import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/auth-2fa.service', () => ({}))

let TWO_FACTOR_PENDING_COOKIE: typeof import('./two-factor').TWO_FACTOR_PENDING_COOKIE
let buildPendingCookieValue: typeof import('./two-factor').buildPendingCookieValue
let clearPendingCookieHeader: typeof import('./two-factor').clearPendingCookieHeader

describe('two-factor cookie policy', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalNextAuthSecret = process.env.NEXTAUTH_SECRET

  beforeAll(async () => {
    const mod = await import('./two-factor')
    TWO_FACTOR_PENDING_COOKIE = mod.TWO_FACTOR_PENDING_COOKIE
    buildPendingCookieValue = mod.buildPendingCookieValue
    clearPendingCookieHeader = mod.clearPendingCookieHeader
  })

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-for-two-factor-cookie-policy'
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
    if (originalNextAuthSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET
    } else {
      process.env.NEXTAUTH_SECRET = originalNextAuthSecret
    }
    vi.resetModules()
  })

  it('adds Secure for production pending cookies', () => {
    process.env.NODE_ENV = 'production'

    const cookie = buildPendingCookieValue('pending-id')
    const clearCookie = clearPendingCookieHeader()

    expect(cookie).toContain(`${TWO_FACTOR_PENDING_COOKIE}=`)
    expect(cookie).toContain('Secure')
    expect(clearCookie).toContain('Secure')
  })

  it('omits Secure for local and development pending cookies', () => {
    process.env.NODE_ENV = 'development'

    const cookie = buildPendingCookieValue('pending-id')
    const clearCookie = clearPendingCookieHeader()

    expect(cookie).not.toContain('Secure')
    expect(clearCookie).not.toContain('Secure')
  })
})
