import { beforeEach, describe, expect, it, vi } from 'vitest'

const findRedirectByPath = vi.fn()
let mockedHeaders = new Headers({
  host: 'innerhealth.ru',
})
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/headers', () => ({
  headers: async () => mockedHeaders,
}))

vi.mock('next/navigation', () => ({
  notFound,
}))

vi.mock('@/services/redirect.service', () => ({
  findRedirectByPath,
}))

describe('legacy redirect fallback route', () => {
  beforeEach(() => {
    mockedHeaders = new Headers({
      host: 'innerhealth.ru',
    })
    findRedirectByPath.mockReset()
    notFound.mockClear()
  })

  it('returns configured redirect status and destination for legacy paths', async () => {
    findRedirectByPath.mockResolvedValueOnce({
      destination: '/catalog/nutrienty',
      statusCode: 301,
    })

    const { GET } = await import('./route')
    const response = await GET(new Request('https://innerhealth.ru/nutrienty'))

    expect(findRedirectByPath).toHaveBeenCalledWith('/nutrienty', { brandId: 'inner' })
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://innerhealth.ru/catalog/nutrienty')
  })

  it('uses the public brand origin instead of the internal container origin', async () => {
    mockedHeaders = new Headers({
      host: '0.0.0.0:3000',
    })
    findRedirectByPath.mockResolvedValueOnce({
      destination: '/catalog/nutrienty',
      statusCode: 301,
    })

    const { GET } = await import('./route')
    const response = await GET(new Request('http://0.0.0.0:3000/nutrienty'))

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://innerhealth.ru/catalog/nutrienty')
  })

  it('keeps redirects on the public origin from the requested URL', async () => {
    mockedHeaders = new Headers({
      host: 'sprint-power.ru',
    })
    findRedirectByPath.mockResolvedValueOnce({
      destination: '/catalog/nutrienty',
      statusCode: 301,
    })

    const { GET } = await import('./route')
    const response = await GET(new Request('https://sprint-power.ru/nutrienty'))

    expect(findRedirectByPath).toHaveBeenCalledWith('/nutrienty', { brandId: 'sprint-power' })
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://sprint-power.ru/catalog/nutrienty')
  })

  it('falls through to the site 404 when no redirect exists', async () => {
    findRedirectByPath.mockResolvedValueOnce(null)

    const { GET } = await import('./route')

    await expect(GET(new Request('https://innerhealth.ru/missing'))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})
