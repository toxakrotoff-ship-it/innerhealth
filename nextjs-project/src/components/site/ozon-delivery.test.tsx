/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OzonDelivery } from './ozon-delivery'

const point = { id: 123, name: 'Пункт Ozon', address: 'Москва, Тверская, 10' }
const quote = {
  quoteToken: 'quote-123', deliverySum: 250, estimatedDeliveryDays: 3,
  expiresAt: new Date(Date.now() + 60_000).toISOString(), point,
}
const baseProps = { phone: '+7 (999) 123-45-67', items: [{ productId: 'p1', quantity: 1 }], brandId: 'inner' as const }

async function choosePoint() {
  fireEvent.change(screen.getByLabelText('Город или адрес пункта выдачи'), { target: { value: 'Москва' } })
  fireEvent.click(screen.getByText('Найти пункты'))
  fireEvent.click(await screen.findByText('Пункт Ozon'))
}

function mockApi(quoteResponse = quote) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(
    String(input).includes('/points?') ? { points: [point] } : quoteResponse,
  )))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Ozon pickup delivery', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('searches without contact data and quotes only after the customer requests calculation', async () => {
    const fetchMock = mockApi()
    const onChange = vi.fn()
    render(<OzonDelivery {...baseProps} promoCodeId="promo-1" onChange={onChange} />)
    await choosePoint()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [searchUrl, searchOptions] = fetchMock.mock.calls[0]
    expect(searchUrl).toBe('/api/ozon-delivery/points?query=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&brand=inner')
    expect(searchOptions).not.toHaveProperty('body')
    fireEvent.click(screen.getByText('Рассчитать доставку Ozon'))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(quote))
    const request = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(request[0]).toBe('/api/ozon-delivery/quote?brand=inner')
    expect(JSON.parse(String(request[1].body))).toEqual({ phone: baseProps.phone, items: baseProps.items, deliveryPointId: point.id, promoCodeId: 'promo-1' })
    expect(screen.getByRole('status')).toHaveTextContent('250 ₽')
  })

  it('requires a valid phone before sending it for calculation', async () => {
    const fetchMock = mockApi()
    render(<OzonDelivery {...baseProps} phone="" onChange={vi.fn()} />)
    await choosePoint()
    expect(screen.getByText('Рассчитать доставку Ozon')).toBeDisabled()
    expect(screen.getByText(/Укажите корректный телефон/)).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['phone', 'cart', 'promo'] as const)('invalidates a pending quote after %s changes', async (change) => {
    let finishQuote!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/points?')) return new Response(JSON.stringify({ points: [point] }))
      return new Promise<Response>((resolve) => { finishQuote = resolve })
    }))
    const onChange = vi.fn()
    const { rerender } = render(<OzonDelivery {...baseProps} onChange={onChange} />)
    await choosePoint()
    fireEvent.click(screen.getByText('Рассчитать доставку Ozon'))
    rerender(<OzonDelivery {...baseProps}
      phone={change === 'phone' ? '+7 (999) 765-43-21' : baseProps.phone}
      items={change === 'cart' ? [{ productId: 'p1', quantity: 2 }] : baseProps.items}
      promoCodeId={change === 'promo' ? 'new-promo' : undefined} onChange={onChange} />)
    finishQuote(new Response(JSON.stringify(quote)))
    await waitFor(() => expect(screen.getByText('Рассчитать доставку Ozon')).toBeEnabled())
    expect(onChange).not.toHaveBeenCalledWith(quote)
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.queryByText(/Доставка: 250/)).not.toBeInTheDocument()
  })

  it('invalidates the price when another point is selected', async () => {
    mockApi()
    const onChange = vi.fn()
    render(<OzonDelivery {...baseProps} onChange={onChange} />)
    await choosePoint()
    fireEvent.click(screen.getByText('Рассчитать доставку Ozon'))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(quote))
    fireEvent.change(screen.getByLabelText('Город или адрес пункта выдачи'), { target: { value: 'Казань' } })
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.queryByText(/Доставка: 250/)).not.toBeInTheDocument()
  })

  it('requires recalculation after the quote expires', async () => {
    const shortQuote = { ...quote, expiresAt: new Date(Date.now() + 400).toISOString() }
    mockApi(shortQuote)
    const onChange = vi.fn()
    render(<OzonDelivery {...baseProps} onChange={onChange} />)
    await choosePoint()
    fireEvent.click(screen.getByText('Рассчитать доставку Ozon'))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(shortQuote))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Расчёт доставки устарел'))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('shows search failures and empty results', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Поиск временно недоступен' }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ points: [] })))
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Город или адрес пункта выдачи'), { target: { value: 'Москва' } })
    fireEvent.click(screen.getByText('Найти пункты'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Поиск временно недоступен')
    fireEvent.click(screen.getByText('Найти пункты'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Пункты выдачи не найдены'))
  })
})
