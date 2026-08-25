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

const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/checkout-sessions',
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}))

import CheckoutSessionsPage from './page'

const SAMPLE_ITEM = {
  id: 'sess-1',
  createdAt: '2026-08-20T10:00:00.000Z',
  lastActivityAt: '2026-08-20T10:05:00.000Z',
  fullName: 'Иван Петров',
  phone: '+79991234567',
  email: 'ivan@example.com',
  cartItemsCount: 2,
  cartTotal: 3400,
  currentStep: 'DELIVERY',
  status: 'ABANDONED',
  order: null,
}

beforeEach(() => {
  mockReplace.mockReset()
  global.fetch = vi.fn()
})

describe('CheckoutSessionsPage (admin list)', () => {
  it('renders the table with expected columns and a data row', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [SAMPLE_ITEM], total: 1 }),
    } as Response)

    render(<CheckoutSessionsPage />)

    expect(screen.getByText('Дата')).toBeTruthy()
    expect(screen.getByText('Клиент')).toBeTruthy()
    expect(screen.getByText('Причина')).toBeTruthy()
    expect(screen.getByText('Статус')).toBeTruthy()

    await waitFor(() => expect(screen.getByText('Иван Петров')).toBeTruthy())
    expect(screen.getByText('+79991234567')).toBeTruthy()
    expect(screen.getByText('2 шт.')).toBeTruthy()
    expect(screen.getAllByText('Брошен').length).toBeGreaterThan(0)
    // Причина по этапу DELIVERY при ACTIVE-подобном отображении (компактная версия)
    expect(screen.getByText('Выбрал доставку, но не подтвердил заказ')).toBeTruthy()
  })

  it('shows "—" for a session without an order, and a link for one with an order', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [SAMPLE_ITEM, { ...SAMPLE_ITEM, id: 'sess-2', order: { id: 'o1', orderNumber: 777 } }],
        total: 2,
      }),
    } as Response)

    render(<CheckoutSessionsPage />)

    await waitFor(() => expect(screen.getByText('№777')).toBeTruthy())
  })

  it('renders an empty state when there are no sessions', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    } as Response)

    render(<CheckoutSessionsPage />)

    await waitFor(() => expect(screen.getByText('Записей не найдено')).toBeTruthy())
  })

  it('shows an error state with a retry button when the request fails', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)

    render(<CheckoutSessionsPage />)

    await waitFor(() => expect(screen.getByText('Ошибка')).toBeTruthy())
    expect(screen.getByText('Повторить')).toBeTruthy()
  })
})
