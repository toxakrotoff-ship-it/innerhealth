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

describe('admin brand propagation', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ADMIN_SECRET_PATH', 'manage')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each(['inner', 'sprint-power'])('renders the URL brand %s despite conflicting proxy headers and cookies', async (brand) => {
    const otherBrand = brand === 'inner' ? 'sprint-power' : 'inner'
    const { default: proxy } = await import('./proxy')
    const response = await proxy(new Request(`https://sprintpower.ru/manage/${brand}/catalog?tab=products`, {
      headers: { 'x-brand': otherBrand, cookie: `ih_admin_brand=${otherBrand}`, 'x-request-id': 'preserved' },
    }) as never)

    expect(response?.headers.get('x-middleware-rewrite')).toBe('https://sprintpower.ru/admin/catalog?tab=products')
    expect(response?.headers.get('x-middleware-request-x-brand')).toBe(brand)
    expect(response?.headers.get('x-middleware-request-x-request-id')).toBe('preserved')
    expect(response?.cookies.get('ih_admin_brand')?.value).toBe(brand)
  })

  it.each(['/manage', '/manage/catalog', '/api/admin/products'])('retains switched brand on unscoped navigation/API at %s', async (path) => {
    const { default: proxy } = await import('./proxy')
    const response = await proxy(new Request(`https://sprintpower.ru${path}`, {
      headers: { 'x-brand': 'sprint-power', cookie: 'ih_admin_brand=inner' },
    }) as never)

    expect(response?.headers.get('x-middleware-request-x-brand')).toBe('inner')
  })

  it('does not apply the admin cookie to storefront requests', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { default: proxy } = await import('./proxy')
    const response = await proxy(new Request('https://sprintpower.ru/catalog', {
      headers: { 'x-brand': 'sprint-power', cookie: 'ih_admin_brand=inner' },
    }) as never)

    expect(response?.headers.get('x-middleware-request-x-brand')).toBeNull()
  })
})
