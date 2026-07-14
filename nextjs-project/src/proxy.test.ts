import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-auth/middleware', () => ({
  withAuth: (handler: typeof import('./proxy').default) => handler,
}))

describe('applyRedirectIfMatched', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const fetchMock = vi.fn()

  beforeEach(() => {
    process.env.NODE_ENV = 'production'
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('preserves exact 302 redirects from redirect-check for SEO redirects', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          destination: '/catalog/nutrienty',
          statusCode: 302,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    )

    const { applyRedirectIfMatched } = await import('./proxy')
    const response = await applyRedirectIfMatched(
      new Request('https://innerhealth.ru/nutrienty')
    )

    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('https://innerhealth.ru/catalog/nutrienty')
  })

  it('preserves exact 301 redirects from redirect-check for permanent SEO redirects', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          destination: '/catalog/collagen',
          statusCode: 301,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    )

    const { applyRedirectIfMatched } = await import('./proxy')
    const response = await applyRedirectIfMatched(
      new Request('https://innerhealth.ru/collagen')
    )

    expect(response?.status).toBe(301)
    expect(response?.headers.get('location')).toBe('https://innerhealth.ru/catalog/collagen')
  })
})
