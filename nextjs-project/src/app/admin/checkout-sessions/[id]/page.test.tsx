/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'sess-1' }),
}))

import CheckoutSessionDetailPage from './page'

const BASE_SESSION = {
  id: 'sess-1',
  brand: 'inner',
  userId: null,
  fullName: null,
  phone: null,
  email: null,
  cartSnapshot: [{ productId: 'p1', title: 'Коллаген', quantity: 2, price: 1000 }],
  cartItemsCount: 2,
  cartTotal: 2000,
  promoCode: null,
  deliveryMethod: 'cdek_pvz',
  deliverySum: 300,
  currentStep: 'DELIVERY',
  lastCompletedStep: 'CONTACT',
  status: 'ABANDONED',
  paymentProvider: null,
  paymentId: null,
  paymentStatus: null,
  createdAt: '2026-08-20T10:00:00.000Z',
  lastActivityAt: '2026-08-20T10:05:00.000Z',
  completedAt: null,
  events: [
    { id: 'ev-1', eventType: 'CHECKOUT_STARTED', step: 'CART', metadata: null, createdAt: '2026-08-20T10:00:00.000Z' },
    { id: 'ev-2', eventType: 'DELIVERY_SELECTED', step: 'DELIVERY', metadata: { deliveryMethod: 'cdek_pvz' }, createdAt: '2026-08-20T10:04:00.000Z' },
  ],
  order: null,
}

beforeEach(() => {
  global.fetch = vi.fn()
})

describe('CheckoutSessionDetailPage', () => {
  it('shows "не указано" for missing contact fields instead of blank/undefined', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => BASE_SESSION,
    } as Response)

    render(<CheckoutSessionDetailPage />)

    await waitFor(() => expect(screen.getAllByText('не указано').length).toBeGreaterThan(0))
    expect(screen.queryByText('undefined')).toBeNull()
  })

  it('hides the payment section when there is no paymentId, without crashing', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => BASE_SESSION,
    } as Response)

    render(<CheckoutSessionDetailPage />)

    await waitFor(() => expect(screen.getByText('Корзина')).toBeTruthy())
    expect(screen.queryByText('Платёж')).toBeNull()
  })

  it('shows the payment section when paymentId is present', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...BASE_SESSION,
        paymentProvider: 'yookassa',
        paymentId: 'pmt-123',
        paymentStatus: 'pending',
      }),
    } as Response)

    render(<CheckoutSessionDetailPage />)

    await waitFor(() => expect(screen.getByText('Платёж')).toBeTruthy())
    expect(screen.getByText('pmt-123')).toBeTruthy()
  })

  it('renders the timeline in order with human-readable event labels', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => BASE_SESSION,
    } as Response)

    render(<CheckoutSessionDetailPage />)

    await waitFor(() => expect(screen.getByText('Checkout начат')).toBeTruthy())
    expect(screen.getByText('Выбрана доставка')).toBeTruthy()
  })

  it('renders a 404 state without crashing when the session is not found', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response)

    render(<CheckoutSessionDetailPage />)

    await waitFor(() => expect(screen.getByText('Сессия не найдена')).toBeTruthy())
  })
})
