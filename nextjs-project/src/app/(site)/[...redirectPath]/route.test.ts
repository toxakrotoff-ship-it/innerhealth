import { describe, expect, it, vi } from 'vitest'

const findRedirectByPath = vi.fn()
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({
      host: 'innerhealth.ru',
    }),
}))

vi.mock('next/navigation', () => ({
  notFound,
}))

vi.mock('@/services/redirect.service', () => ({
  findRedirectByPath,
}))

describe('legacy redirect fallback route', () => {
  it('returns configured redirect status and destination for legacy paths', async () => {
    findRedirectByPath.mockResolvedValueOnce({
      destination: '/catalog/nutrienty',
      statusCode: 301,
    })

    const { GET } = await import('./route')
    const response = await GET(new Request('https://innerhealth.ru/nutrienty'))

    expect(findRedirectByPath).toHaveBeenCalledWith('/nutrienty', { brandId: 'inner' })
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('/catalog/nutrienty')
  })

  it('falls through to the site 404 when no redirect exists', async () => {
    findRedirectByPath.mockResolvedValueOnce(null)

    const { GET } = await import('./route')

    await expect(GET(new Request('https://innerhealth.ru/missing'))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
  })
})
