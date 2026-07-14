import { beforeEach, describe, expect, it, vi } from 'vitest'

const findRedirectByPath = vi.fn()
const redirect = vi.fn((destination: string) => {
  throw new Error(`redirect:${destination}`)
})
const permanentRedirect = vi.fn((destination: string) => {
  throw new Error(`permanentRedirect:${destination}`)
})
const notFound = vi.fn(() => {
  throw new Error('notFound')
})

let mockedHeaders = new Headers({
  host: 'innerhealth.ru',
})

vi.mock('next/headers', () => ({
  headers: async () => mockedHeaders,
}))

vi.mock('next/navigation', () => ({
  redirect,
  permanentRedirect,
  notFound,
}))

vi.mock('@/services/redirect.service', () => ({
  findRedirectByPath,
}))

describe('legacy redirect fallback page', () => {
  beforeEach(() => {
    mockedHeaders = new Headers({
      host: 'innerhealth.ru',
    })
    findRedirectByPath.mockReset()
    redirect.mockClear()
    permanentRedirect.mockClear()
    notFound.mockClear()
  })

  it('uses permanent redirects for permanent legacy paths', async () => {
    findRedirectByPath.mockResolvedValueOnce({
      destination: '/catalog/nutrienty',
      statusCode: 301,
    })

    const { default: Page } = await import('./page')

    await expect(
      Page({ params: Promise.resolve({ redirectPath: ['nutrienty'] }) })
    ).rejects.toThrow('permanentRedirect:https://innerhealth.ru/catalog/nutrienty')

    expect(findRedirectByPath).toHaveBeenCalledWith('/nutrienty', { brandId: 'inner' })
  })

  it('uses the public brand origin instead of the internal container origin', async () => {
    mockedHeaders = new Headers({
      host: '0.0.0.0:3000',
    })
    findRedirectByPath.mockResolvedValueOnce({
      destination: '/catalog/nutrienty',
      statusCode: 301,
    })

    const { default: Page } = await import('./page')

    await expect(
      Page({ params: Promise.resolve({ redirectPath: ['nutrienty'] }) })
    ).rejects.toThrow('permanentRedirect:https://innerhealth.ru/catalog/nutrienty')
  })

  it('keeps redirects on the public origin from the requested host', async () => {
    mockedHeaders = new Headers({
      host: 'sprint-power.ru',
    })
    findRedirectByPath.mockResolvedValueOnce({
      destination: '/catalog/nutrienty',
      statusCode: 302,
    })

    const { default: Page } = await import('./page')

    await expect(
      Page({ params: Promise.resolve({ redirectPath: ['nutrienty'] }) })
    ).rejects.toThrow('redirect:https://sprint-power.ru/catalog/nutrienty')

    expect(findRedirectByPath).toHaveBeenCalledWith('/nutrienty', { brandId: 'sprint-power' })
  })

  it('falls through to the shared site 404 when no redirect exists', async () => {
    findRedirectByPath.mockResolvedValueOnce(null)

    const { default: Page } = await import('./page')

    await expect(
      Page({ params: Promise.resolve({ redirectPath: ['missing'] }) })
    ).rejects.toThrow('notFound')

    expect(notFound).toHaveBeenCalled()
  })
})
