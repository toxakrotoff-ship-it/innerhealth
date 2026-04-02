/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartPageContent } from './cart-page-content'

interface MockCartLine {
  productId: string
  quantity: number
  title?: string
  price?: number
  photo?: string | null
  slug?: string | null
  hasPromoPrice?: boolean
  isPromoEligible?: boolean
  discountPrice?: number | null
}

interface MockCartStoreState {
  items: MockCartLine[]
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  mergeItemDetails: (productId: string, details: Record<string, unknown>) => void
  clearCart: () => void
}

const mockCartStoreState: MockCartStoreState = {
  items: [
    {
      productId: 'p1',
      quantity: 1,
      title: 'Тестовый товар',
      price: 1200,
      photo: null,
      slug: 'test-item',
      hasPromoPrice: false,
      isPromoEligible: true,
      discountPrice: null,
    },
  ],
  removeItem: vi.fn(),
  updateQuantity: vi.fn(),
  mergeItemDetails: vi.fn(),
  clearCart: vi.fn(),
}

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img alt={String(props.alt ?? '')} />,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@/hooks/use-mounted', () => ({
  useMounted: () => true,
}))

vi.mock('@/store/cart-store', () => ({
  useCartStore: (selector: (state: MockCartStoreState) => unknown) => selector(mockCartStoreState),
}))

vi.mock('@/components/site/cdek-widget', () => ({
  CdekWidget: () => <div data-testid="mock-cdek-widget">CDEK Widget</div>,
}))

vi.mock('@/components/site/saved-address-selector', () => ({
  SavedAddressSelector: ({
    usingSavedAddress,
    onUseSavedAddress,
    onUseAnotherAddress,
  }: {
    usingSavedAddress: boolean
    onUseSavedAddress: () => void
    onUseAnotherAddress: () => void
  }) => (
    <div>
      {!usingSavedAddress ? (
        <button type="button" onClick={onUseSavedAddress}>
          Использовать сохранённый адрес
        </button>
      ) : (
        <button type="button" onClick={onUseAnotherAddress}>
          Использовать другой адрес
        </button>
      )}
    </div>
  ),
}))

vi.mock('@/components/ui/responsive-text', () => ({
  Heading2: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={className}>{children}</h2>
  ),
}))

vi.mock('@/components/ui/scalable-spacing', () => ({
  ScalableSpacing: () => null,
}))

describe('CartPageContent delivery type switch', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('alert', vi.fn())
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/orders')) {
        return {
          ok: true,
          json: async () => ({ confirmationUrl: null }),
        }
      }
      if (url.includes('/api/account/addresses')) {
        return {
          ok: true,
          json: async () => [],
        }
      }
      if (url.includes('/api/cdek/calculator')) {
        return {
          ok: true,
          json: async () => ({ tariffs: [] }),
        }
      }
      return {
        ok: true,
        json: async () => [],
      }
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('uses pickup by default and keeps CDEK widget preloaded but hidden', async () => {
    const user = userEvent.setup({ document })
    render(
      <CartPageContent pickupAddress="г. Москва, набережная Новикова-Прибоя, 6 к4, 2-й этаж, офис Inner Health" />
    )

    const [pickupRadio, cdekRadio] = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(pickupRadio.checked).toBe(true)
    expect(cdekRadio.checked).toBe(false)

    const cdekWidget = screen.getByTestId('mock-cdek-widget')
    expect(cdekWidget).toBeInTheDocument()
    expect(cdekWidget).not.toBeVisible()
    expect(
      screen.getByText('г. Москва, набережная Новикова-Прибоя, 6 к4, 2-й этаж, офис Inner Health')
    ).toBeInTheDocument()

    await user.click(cdekRadio)
    expect(cdekRadio.checked).toBe(true)
    expect(pickupRadio.checked).toBe(false)
    expect(cdekWidget).toBeVisible()
  })

  it('renders required name field and keeps it empty by default', () => {
    render(<CartPageContent pickupAddress="Тестовый адрес" />)

    const nameInput = screen.getByLabelText('Имя') as HTMLInputElement
    expect(nameInput).toBeInTheDocument()
    expect(nameInput.value).toBe('')
    expect(nameInput.required).toBe(true)
  })

  it('submits shipping.fullName from the name field', async () => {
    const user = userEvent.setup({ document })
    render(<CartPageContent pickupAddress="г. Москва, Тестовый адрес" />)

    await user.type(screen.getByLabelText('Имя'), 'Иванов Иван Иванович')
    await user.type(screen.getByLabelText('Телефон'), '+7 (999) 123-45-67')
    await user.type(screen.getByLabelText('Email'), 'ivanov@example.com')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByText('Оформить заказ'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/orders',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      )
    })

    const orderRequest = fetchMock.mock.calls.find(([url]) => String(url) === '/api/orders')
    expect(orderRequest).toBeTruthy()
    const requestInit = orderRequest?.[1] as RequestInit
    const payload = JSON.parse(String(requestInit.body))
    expect(payload.shipping.fullName).toBe('Иванов Иван Иванович')
    expect(payload.shipping.city).toBe('Москва')
    expect(payload.shipping.address).toBe('г. Москва, Тестовый адрес')
    expect(payload.shipping.deliveryMethod).toBe('pickup')
  })

  it('does not submit when required name field is empty', async () => {
    const user = userEvent.setup({ document })
    render(<CartPageContent pickupAddress="Тестовый адрес" />)

    await user.type(screen.getByLabelText('Телефон'), '+7 (999) 123-45-67')
    await user.type(screen.getByLabelText('Email'), 'ivanov@example.com')
    await user.click(screen.getByRole('checkbox'))

    const submitButton = screen.getByText('Оформить заказ')
    const form = submitButton.closest('form')
    expect(form).not.toBeNull()
    expect(form?.checkValidity()).toBe(false)

    await user.click(submitButton)

    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/orders',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('uses calculator tariffs for saved cdek_door addresses without widget service recalculation', async () => {
    const user = userEvent.setup({ document })
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('/api/account/addresses')) {
        return {
          ok: true,
          json: async () => ([
            {
              id: 'addr-1',
              label: 'Дом',
              city: 'Москва',
              postalCode: '101000',
              addressLine: 'ул. Тверская, д. 1',
              deliveryMethod: 'cdek_door',
              cdekCityCode: 44,
              cdekCityUuid: 'b308dcad-dbf0-4b22-bf2b-efca9f72ae38',
              cdekPvzCode: null,
              street: 'ул. Тверская',
              house: '1',
              apartment: '12',
              entrance: '',
              floor: '',
              intercom: '',
            },
          ]),
        }
      }

      if (url.includes('/api/cdek/calculator')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { deliveryKind?: string }
        return {
          ok: true,
          json: async () => ({
            tariffs:
              body.deliveryKind === 'address'
                ? [{ tariffCode: 137, deliverySum: 450, periodMin: 2, periodMax: 4 }]
                : [],
          }),
        }
      }

      if (url.includes('/api/orders')) {
        return {
          ok: true,
          json: async () => ({ confirmationUrl: null }),
        }
      }

      if (url.includes('/api/cdek-widget/service')) {
        throw new Error('saved cdek_door flow should not call widget service')
      }

      return {
        ok: true,
        json: async () => [],
      }
    })

    render(<CartPageContent pickupAddress="г. Москва, Тестовый адрес" />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/account/addresses',
        expect.objectContaining({
          credentials: 'include',
          cache: 'no-store',
        })
      )
    })

    await user.click(screen.getByText('Использовать сохранённый адрес'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/cdek/calculator',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"deliveryKind":"address"'),
        })
      )
    })

    await user.type(screen.getByLabelText('Имя'), 'Иванов Иван Иванович')
    await user.type(screen.getByLabelText('Телефон'), '+7 (999) 123-45-67')
    await user.type(screen.getByLabelText('Email'), 'ivanov@example.com')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByText('Оформить заказ'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/orders',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      )
    })

    const orderRequest = fetchMock.mock.calls.find(([url]) => String(url) === '/api/orders')
    expect(orderRequest).toBeTruthy()
    const requestInit = orderRequest?.[1] as RequestInit
    const payload = JSON.parse(String(requestInit.body))

    expect(payload.shipping.deliveryMethod).toBe('cdek_door')
    expect(payload.shipping.cdekCityCode).toBe(44)
    expect(payload.shipping.cdekCityUuid).toBe('b308dcad-dbf0-4b22-bf2b-efca9f72ae38')
    expect(payload.shipping.cdekTariffCode).toBe(137)
    expect(payload.shipping.doorAddress).toEqual({
      street: 'ул. Тверская',
      house: '1',
      apartment: '12',
      entrance: undefined,
      floor: undefined,
      intercom: undefined,
    })
    expect(screen.queryByText('Не удалось определить тариф СДЭК до двери')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/cdek-widget/service'))).toBe(false)
  })
})
