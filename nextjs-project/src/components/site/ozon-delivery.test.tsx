/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OzonDelivery } from './ozon-delivery'

const point = { id: 123, name: 'Пункт Ozon', address: 'Москва, Тверская, 10' }
const quote = {
  quoteToken: 'quote-123', deliverySum: 250, estimatedDeliveryDays: 3,
  expiresAt: new Date(Date.now() + 60_000).toISOString(), point,
}
const baseProps = { phone: '+7 (999) 123-45-67', items: [{ productId: 'p1', quantity: 1 }], brandId: 'inner' as const, city: 'Москва' }

async function choosePoint() {
  fireEvent.click(await screen.findByText('Пункт Ozon'))
}

function mockApi(quoteResponse = quote) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(
    String(input).includes('/points?') ? { points: [point] } : String(input).includes('/city') ? { city: null } : quoteResponse,
  )))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Ozon pickup delivery', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('searches without contact data and quotes only after the customer requests calculation', async () => {
    const fetchMock = mockApi()
    const onChange = vi.fn()
    render(<OzonDelivery {...baseProps} promoCodeId="promo-1" onChange={onChange} />)
    await choosePoint()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [searchUrl, searchOptions] = fetchMock.mock.calls[0]
    expect(searchUrl).toBe('/api/ozon-delivery/points?city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&brand=inner')
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

  it.each(['phone', 'cart', 'promo', 'city'] as const)('invalidates a pending quote after %s changes', async (change) => {
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
      city={change === 'city' ? 'Самара' : baseProps.city}
      promoCodeId={change === 'promo' ? 'new-promo' : undefined} onChange={onChange} />)
    finishQuote(new Response(JSON.stringify(quote)))
    if (change !== 'city') await waitFor(() => expect(screen.getByText('Рассчитать доставку Ozon')).toBeEnabled())
    else expect(screen.queryByText('Рассчитать доставку Ozon')).not.toBeInTheDocument()
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
    fireEvent.change(screen.getByLabelText('Город доставки Ozon'), { target: { value: 'Казань' } })
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.queryByText(/Доставка: 250/)).not.toBeInTheDocument()
  })

  it('requires recalculation after the quote expires', async () => {
    const shortQuote = { ...quote, expiresAt: new Date(Date.now() + 1000).toISOString() }
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
    fireEvent.click(screen.getByText('Найти пункты'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Поиск временно недоступен')
    fireEvent.click(screen.getByText('Найти пункты'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Пункты выдачи не найдены'))
  })

  it('automatically loads the checkout city and narrows address search to that city', async () => {
    localStorage.setItem('ozon-delivery-city:inner', 'Казань')
    const fetchMock = mockApi()
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Город доставки Ozon')).toHaveValue('Москва')
    await screen.findByText('Пункт Ozon')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/city'))).toBe(false)
    fireEvent.change(screen.getByLabelText('Улица или адрес пункта выдачи'), { target: { value: 'Тверская, 10' } })
    fireEvent.click(screen.getByText('Найти пункты'))
    await screen.findByText('Пункт Ozon')
    const url = new URL(String(fetchMock.mock.lastCall![0]), 'https://example.com')
    expect(url.searchParams.get('city')).toBe('Москва')
    expect(url.searchParams.get('query')).toBe('Тверская, 10')
    expect(url.searchParams.get('brand')).toBe('inner')
  })

  it('loads the detected city when checkout and remembered city are absent', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(
      String(input).includes('/city') ? { city: 'Казань' } : { points: [point], hasMore: true },
    )))
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonDelivery {...baseProps} city={undefined} onChange={vi.fn()} />)
    await screen.findByText('Пункт Ozon')
    expect(screen.getByLabelText('Город доставки Ozon')).toHaveValue('Казань')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/ozon-delivery/city?brand=inner')
    expect(new URL(String(fetchMock.mock.calls[1][0]), 'https://example.com').searchParams.get('city')).toBe('Казань')
    expect(screen.getByText(/Показаны первые 30 пунктов/)).toBeVisible()
  })

  it('preserves a manually selected city across remounts without leaking it to the other brand', async () => {
    const fetchMock = mockApi()
    const first = render(<OzonDelivery {...baseProps} city={undefined} onChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Город доставки Ozon'), { target: { value: 'Казань' } })
    await screen.findByText('Пункт Ozon')
    expect(localStorage.getItem('ozon-delivery-city:inner')).toBe('Казань')
    first.unmount()
    fetchMock.mockClear()
    const { rerender } = render(<OzonDelivery {...baseProps} city={undefined} onChange={vi.fn()} />)
    await screen.findByText('Пункт Ozon')
    expect(screen.getByLabelText('Город доставки Ozon')).toHaveValue('Казань')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/city'))).toBe(false)
    rerender(<OzonDelivery {...baseProps} brandId="sprint-power" city={undefined} onChange={vi.fn()} />)
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/ozon-delivery/city?brand=sprint-power')).toBe(true))
    expect(screen.getByLabelText('Город доставки Ozon')).toHaveValue('')
    expect(screen.queryByText('Пункт Ozon')).not.toBeInTheDocument()
  })

  it('does not let late geolocation replace manual city input', async () => {
    let finishDetection!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).includes('/city')
      ? new Promise<Response>(resolve => { finishDetection = resolve })
      : new Response(JSON.stringify({ points: [point] }))))
    render(<OzonDelivery {...baseProps} city={undefined} onChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Город доставки Ozon'), { target: { value: 'Казань' } })
    finishDetection(new Response(JSON.stringify({ city: 'Москва' })))
    await screen.findByText('Пункт Ozon')
    expect(screen.getByLabelText('Город доставки Ozon')).toHaveValue('Казань')
    expect(localStorage.getItem('ozon-delivery-city:inner')).toBe('Казань')
  })

  it('keeps manual city input available when geolocation is unavailable', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes('/city')
      ? new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 })
      : new Response(JSON.stringify({ points: [point] })))
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonDelivery {...baseProps} city={undefined} onChange={vi.fn()} />)
    await waitFor(() => expect(screen.queryByText('Определяем город…')).not.toBeInTheDocument())
    expect(screen.getByText('Найти пункты')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Город доставки Ozon'), { target: { value: 'Москва' } })
    await screen.findByText('Пункт Ozon')
  })

  it('ignores stale point search results when the customer changes cities', async () => {
    let finishFirstSearch!: (response: Response) => void
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => new URL(String(input), 'https://example.com').searchParams.get('city') === 'Москва'
      ? new Promise<Response>(resolve => { finishFirstSearch = resolve })
      : new Response(JSON.stringify({ points: [{ ...point, name: 'Пункт Казань' }] })))
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Город доставки Ozon'), { target: { value: 'Казань' } })
    await screen.findByText('Пункт Казань')
    finishFirstSearch(new Response(JSON.stringify({ points: [point] })))
    await waitFor(() => expect(screen.queryByText('Пункт Ozon')).not.toBeInTheDocument())
    expect(screen.getByText('Пункт Казань')).toBeVisible()
  })

  it('applies a changed checkout city but keeps manual edits during unrelated renders', async () => {
    mockApi()
    const onChange = vi.fn()
    const { rerender } = render(<OzonDelivery {...baseProps} onChange={onChange} />)
    await choosePoint()
    fireEvent.change(screen.getByLabelText('Город доставки Ozon'), { target: { value: 'Казань' } })
    rerender(<OzonDelivery {...baseProps} phone="+7 (999) 765-43-21" onChange={onChange} />)
    expect(screen.getByLabelText('Город доставки Ozon')).toHaveValue('Казань')
    rerender(<OzonDelivery {...baseProps} city="Самара" onChange={onChange} />)
    expect(screen.getByLabelText('Город доставки Ozon')).toHaveValue('Самара')
    expect(screen.queryByText('Выбран пункт выдачи: Москва, Тверская, 10')).not.toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
