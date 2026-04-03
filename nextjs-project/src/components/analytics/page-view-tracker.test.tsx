/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageViewTracker } from './page-view-tracker'

const logAnalyticsEventMock = vi.fn()
const usePathnameMock = vi.fn()
const useSearchParamsMock = vi.fn()
const resolveBrandByHostMock = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('@/lib/analytics/analytics-client', () => ({
  logAnalyticsEvent: (...args: unknown[]) => logAnalyticsEventMock(...args),
}))

vi.mock('@/lib/analytics/device-type', () => ({
  detectAnalyticsDeviceType: () => 'desktop',
}))

vi.mock('@/lib/brand/brand', () => ({
  normalizeBrandId: (value: string | null) => value,
  resolveBrandByHost: (...args: unknown[]) => resolveBrandByHostMock(...args),
}))

describe('PageViewTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePathnameMock.mockReturnValue('/catalog')
    useSearchParamsMock.mockReturnValue(new URLSearchParams('q=protein'))
    resolveBrandByHostMock.mockReturnValue('inner')
    window.localStorage.clear()
    document.cookie = 'ih_active_brand=inner'
    document.title = 'Catalog'
  })

  it('logs page view on mount', () => {
    render(<PageViewTracker />)

    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAGE_VIEW',
        path: '/catalog?q=protein',
      })
    )
  })

  it('logs generic click for interactive elements', async () => {
    const user = userEvent.setup()

    render(
      <>
        <PageViewTracker />
        <button type="button">Подробнее</button>
      </>
    )

    await user.click(screen.getByText('Подробнее'))

    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CLICK',
        path: '/catalog?q=protein',
        meta: expect.objectContaining({
          kind: 'ui_click',
          element: 'button',
          text: 'Подробнее',
        }),
      })
    )
  })

  it('skips elements with manual analytics marker', async () => {
    const user = userEvent.setup()

    render(
      <>
        <PageViewTracker />
        <button type="button" data-analytics-click="manual">
          В корзину
        </button>
      </>
    )

    await user.click(screen.getByText('В корзину'))

    expect(logAnalyticsEventMock).toHaveBeenCalledTimes(1)
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAGE_VIEW',
      })
    )
  })

  it('skips disabled buttons and modified clicks', async () => {
    const user = userEvent.setup()

    render(
      <>
        <PageViewTracker />
        <button type="button" disabled>
          Недоступно
        </button>
        <a href="/catalog/protein">Открыть</a>
      </>
    )

    await user.click(screen.getByText('Недоступно'))
    await user.keyboard('[MetaLeft>]')
    await user.click(screen.getByText('Открыть'))
    await user.keyboard('[/MetaLeft]')

    expect(logAnalyticsEventMock).toHaveBeenCalledTimes(1)
    expect(logAnalyticsEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAGE_VIEW',
      })
    )
  })
})
