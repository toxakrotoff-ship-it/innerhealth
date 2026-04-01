/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddToCartButton } from './add-to-cart-button'

const addItemMock = vi.fn()
const openDrawerMock = vi.fn()
const logAnalyticsEventMock = vi.fn()

vi.mock('@/store/cart-store', () => ({
  useCartStore: (selector: (state: { addItem: typeof addItemMock; openDrawer: typeof openDrawerMock }) => unknown) =>
    selector({
      addItem: addItemMock,
      openDrawer: openDrawerMock,
    }),
}))

vi.mock('@/lib/analytics/analytics-client', () => ({
  logAnalyticsEvent: (...args: unknown[]) => logAnalyticsEventMock(...args),
}))

describe('AddToCartButton analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/catalog?q=protein')
  })

  it('logs CLICK and CART_ADD when button is pressed', async () => {
    const user = userEvent.setup()

    render(
      <AddToCartButton
        productId="p-1"
        title="Protein"
        price={1990}
        photo={null}
        slug="protein"
      />
    )

    await user.click(screen.getByText('В корзину'))

    expect(addItemMock).toHaveBeenCalledTimes(1)
    expect(openDrawerMock).toHaveBeenCalledTimes(1)
    expect(logAnalyticsEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'CLICK',
        path: '/catalog?q=protein',
      })
    )
    expect(logAnalyticsEventMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'CART_ADD',
        path: '/catalog?q=protein',
      })
    )
  })

  it('allows wrapped text for disabled compact buttons', () => {
    render(
      <AddToCartButton
        productId="p-2"
        title="Broth"
        price={1400}
        photo={null}
        slug="broth"
        size="sm"
        disabled
      />
    )

    const button = screen.getByText('Товар закончился')
    expect(button.className).toContain('whitespace-normal')
    expect(button.className).toContain('leading-tight')
    expect(button.className).toContain('min-h-[40px]')
  })
})
