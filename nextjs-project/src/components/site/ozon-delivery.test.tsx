/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OzonDelivery } from './ozon-delivery'
import { createHash, webcrypto } from 'node:crypto'

const cdnConfig = vi.hoisted(() => ({ url: '' }))
vi.mock('@/lib/cdn', () => ({ get CDN_URL() { return cdnConfig.url } }))

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

function mockObjectManager() {
  const handlers = new Set<(event: { get: (name: string) => unknown }) => void>()
  const manager = { add: vi.fn(), removeAll: vi.fn(), objects: {
    events: {
      add: (_event: string, handler: (event: { get: (name: string) => unknown }) => void) => handlers.add(handler),
      remove: (_event: string, handler: (event: { get: (name: string) => unknown }) => void) => handlers.delete(handler),
    },
    setObjectOptions: vi.fn(),
  } }
  return { manager, ObjectManager: function () { return manager }, click: (id: number) => handlers.forEach(handler => handler({ get: () => id })) }
}

describe('Ozon pickup delivery', () => {
  beforeEach(() => {
    localStorage.clear()
    cdnConfig.url = ''
    localStorage.setItem('ozon-delivery-input-mode:inner', 'manual')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('offers exclusive map and text selection like CDEK, with map as the default', async () => {
    localStorage.removeItem('ozon-delivery-input-mode:inner')
    mockApi()
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    expect(screen.getByText('Выбрать на карте')).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByLabelText('Карта пунктов выдачи Ozon')).toBeInTheDocument()
    await screen.findByText(/Для этих пунктов пока нет координат/)
    expect(screen.queryByLabelText('Пункты выдачи Ozon')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Заполнить вручную'))
    expect(await screen.findByLabelText('Пункты выдачи Ozon')).toBeVisible()
    expect(screen.queryByLabelText('Карта пунктов выдачи Ozon')).not.toBeInTheDocument()
    expect(localStorage.getItem('ozon-delivery-input-mode:inner')).toBe('manual')
    fireEvent.keyDown(screen.getByText('Заполнить вручную'), { key: 'ArrowLeft' })
    expect(screen.getByText('Выбрать на карте')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Выбрать на карте')).toHaveFocus()
  })

  it('keeps the map area visible before a city is selected', async () => {
    localStorage.removeItem('ozon-delivery-input-mode:inner')
    const fetchMock = mockApi()
    render(<OzonDelivery {...baseProps} city={undefined} onChange={vi.fn()} />)
    const mapArea = screen.getByLabelText('Карта пунктов выдачи Ozon')
    expect(mapArea).toBeVisible()
    expect(mapArea.className).toContain('min-h-[320px]')
    await waitFor(() => expect(mapArea).toHaveTextContent('Укажите город, чтобы показать карту пунктов выдачи.'))
    expect(mapArea).toHaveAttribute('aria-busy', 'false')
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes('/city'))).toBe(true)
  })

  it('lets a blurred partial-city search choose its city from visible map actions and then loads the map', async () => {
    localStorage.removeItem('ozon-delivery-input-mode:inner')
    const createMap = vi.fn(() => ({ geoObjects: { add: vi.fn(), remove: vi.fn() }, setCenter: vi.fn(), setBounds: vi.fn(), destroy: vi.fn() }))
    const objects = mockObjectManager()
    vi.stubGlobal('ymaps', {
      ready: (callback: () => void) => callback(),
      Map: function () { return createMap() },
      ObjectManager: objects.ObjectManager,
      Placemark: function () { return { events: { add: vi.fn() } } },
    })
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request = new URL(String(input), 'https://site')
      return new Response(JSON.stringify(request.searchParams.get('suggestCities') === 'true'
        ? { cities: ['Санкт-Петербург', 'Санкт-Петербург г.'], points: [] }
        : { mapApiKey: 'public-key', points: [{ ...point, coordinates: { latitude: 59.93, longitude: 30.31 } }] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    const input = screen.getByLabelText('Город доставки Ozon')
    fireEvent.change(input, { target: { value: 'Санкт' } })
    fireEvent.blur(input)
    fireEvent.click(screen.getByText('Найти пункты'))
    const cities = await screen.findByLabelText('Города для карты Ozon')
    expect(cities).toBeVisible()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveValue('Санкт')
    expect(createMap).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Карта пунктов выдачи Ozon')).toHaveTextContent('Выберите город, чтобы показать карту пунктов выдачи.')
    const cityButton = screen.getByText('Санкт-Петербург', { selector: 'button' })
    expect(cityButton).toHaveAttribute('type', 'button')
    expect(screen.getByText('Санкт-Петербург г.', { selector: 'button' })).toBeVisible()
    fireEvent.click(cityButton)
    expect(input).toHaveValue('Санкт-Петербург')
    await waitFor(() => expect(createMap).toHaveBeenCalledTimes(1))
    expect(screen.queryByLabelText('Города для карты Ozon')).not.toBeInTheDocument()
    expect(screen.getByText('На карте показаны найденные пункты, для которых доступны координаты.')).toBeVisible()
    expect(new URL(String(fetchMock.mock.lastCall![0]), 'https://site').searchParams.get('city')).toBe('Санкт-Петербург')
  })

  it('shows loading and no-results states inside the map area without removing it', async () => {
    localStorage.removeItem('ozon-delivery-input-mode:inner')
    let finishSearch!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finishSearch = resolve })))
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    const mapArea = screen.getByLabelText('Карта пунктов выдачи Ozon')
    await waitFor(() => expect(mapArea).toHaveTextContent('Загружаем пункты на карту…'))
    expect(mapArea).toHaveAttribute('aria-busy', 'true')
    await act(async () => finishSearch(new Response(JSON.stringify({ points: [] }))))
    expect(mapArea).toBeVisible()
    expect(mapArea).toHaveTextContent('Пункты выдачи не найдены. Уточните город или адрес, чтобы показать карту.')
    expect(mapArea).toHaveAttribute('aria-busy', 'false')
  })

  it('offers retry in the map area after a point search failure', async () => {
    localStorage.removeItem('ozon-delivery-input-mode:inner')
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Поиск временно недоступен' }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ points: [point] })))
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Поиск временно недоступен')
    expect(screen.getByLabelText('Карта пунктов выдачи Ozon')).toHaveTextContent('Не удалось загрузить пункты на карту. Повторите поиск.')
    fireEvent.click(screen.getByText('Повторить поиск'))
    await screen.findByText(/Для этих пунктов пока нет координат/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Повторить поиск')).not.toBeInTheDocument()
  })

  it('preserves the chosen point, search and confirmed quote when switching selection modes', async () => {
    const fetchMock = mockApi()
    const onChange = vi.fn()
    render(<OzonDelivery {...baseProps} onChange={onChange} />)
    await choosePoint()
    fireEvent.click(screen.getByText('Рассчитать доставку Ozon'))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(quote))
    const changeCount = onChange.mock.calls.length
    fireEvent.click(screen.getByText('Выбрать на карте'))
    expect(screen.getByText(`Выбран пункт выдачи: ${point.address}`)).toBeVisible()
    expect(screen.getByText(/Доставка: 250/)).toBeVisible()
    fireEvent.click(screen.getByText('Заполнить вручную'))
    await screen.findByLabelText('Пункты выдачи Ozon')
    expect(screen.getByText(point.address).closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Город доставки Ozon')).toHaveValue('Москва')
    expect(onChange).toHaveBeenCalledTimes(changeCount)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('completes a partial city and loads its points after keyboard selection', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'https://site')
      return new Response(JSON.stringify(url.searchParams.get('suggestCities') === 'true'
        ? { cities: ['Санкт-Петербург'], points: [] }
        : { points: [{ ...point, name: 'Пункт Петербург' }] }))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    const input = screen.getByLabelText('Город доставки Ozon')
    fireEvent.change(input, { target: { value: 'Санкт' } })
    expect(await screen.findByRole('option')).toHaveTextContent('Санкт-Петербург')
    expect(screen.queryByText(/Пункты выдачи не найдены/)).not.toBeInTheDocument()
    expect(localStorage.getItem('ozon-delivery-city:inner')).toBeNull()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).toHaveValue('Санкт-Петербург')
    await screen.findByText('Пункт Петербург')
    expect(localStorage.getItem('ozon-delivery-city:inner')).toBe('Санкт-Петербург')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('selects an address suggestion without submitting checkout', async () => {
    mockApi()
    const submit = vi.fn(event => event.preventDefault())
    render(<form onSubmit={submit}><OzonDelivery {...baseProps} onChange={vi.fn()} /></form>)
    await choosePoint()
    const input = screen.getByLabelText('Улица или адрес пункта выдачи')
    fireEvent.change(input, { target: { value: 'Твер' } })
    expect(await screen.findByRole('option')).toHaveTextContent(point.address)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText(`Выбран пункт выдачи: ${point.address}`)).toBeVisible()
    expect(submit).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('does not show city suggestions from an earlier request', async () => {
    let finishFirst!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const city = new URL(String(input), 'https://site').searchParams.get('city')
      if (city === 'Санкт') return new Promise<Response>(resolve => { finishFirst = resolve })
      return new Response(JSON.stringify({ points: [], cities: ['Самара'] }))
    }))
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    const input = screen.getByLabelText('Город доставки Ozon')
    fireEvent.change(input, { target: { value: 'Санкт' } })
    await waitFor(() => expect(finishFirst).toBeTypeOf('function'))
    fireEvent.change(input, { target: { value: 'Сама' } })
    expect(await screen.findByRole('option')).toHaveTextContent('Самара')
    await act(async () => finishFirst(new Response(JSON.stringify({ points: [], cities: ['Санкт-Петербург'] }))))
    expect(screen.queryByText('Санкт-Петербург')).not.toBeInTheDocument()
    expect(screen.getByRole('option')).toHaveTextContent('Самара')
  })

  it('uses marker selections for calculation and resets the price when another marker is selected', async () => {
    localStorage.removeItem('ozon-delivery-input-mode:inner')
    const objects = mockObjectManager()
    vi.stubGlobal('ymaps', {
      ready: (callback: () => void) => callback(),
      Map: function () { return { geoObjects: { add: vi.fn(), remove: vi.fn() }, setCenter: vi.fn(), setBounds: vi.fn(), destroy: vi.fn() } },
      ObjectManager: objects.ObjectManager,
    })
    const other = { ...point, id: 124, address: 'Москва, Тверская, 20' }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => new Response(JSON.stringify(
      String(input).includes('/points?') ? { mapApiKey: 'public-key', points: [point, other].map(p => ({ ...p, coordinates: { latitude: 55.75, longitude: 37.61 } })) } : quote,
    )))
    vi.stubGlobal('fetch', fetchMock)
    const onChange = vi.fn()
    render(<OzonDelivery {...baseProps} onChange={onChange} />)
    await waitFor(() => expect(objects.manager.add).toHaveBeenCalledTimes(1))
    act(() => objects.click(point.id))
    expect(screen.getByText('Выбран пункт выдачи: Москва, Тверская, 10')).toBeVisible()
    fireEvent.click(screen.getByText('Рассчитать доставку Ozon'))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(quote))
    act(() => objects.click(other.id))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByText('Выбран пункт выдачи: Москва, Тверская, 20')).toBeVisible()
    expect(screen.queryByText(/Доставка: 250/)).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('loads the whole city map, quotes a point beyond the first30 and keeps it selected across list switches', async () => {
    localStorage.removeItem('ozon-delivery-input-mode:inner')
    const objects = mockObjectManager()
    vi.stubGlobal('ymaps', {
      ready: (callback: () => void) => callback(), ObjectManager: objects.ObjectManager,
      Map: function () { return { geoObjects: { add: vi.fn(), remove: vi.fn() }, setCenter: vi.fn(), setBounds: vi.fn(), destroy: vi.fn() } },
    })
    const points = Array.from({ length: 80 }, (_, index) => ({ ...point, id: index + 1,
      name: `Пункт ${index + 1}`, address: `Москва, Адрес ${index + 1}`, coordinates: { latitude: 55.75, longitude: 37.61 } }))
    const selectedQuote = { ...quote, point: points[79] }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'https://site')
      return new Response(JSON.stringify(url.pathname.endsWith('/quote') ? selectedQuote : {
        points: url.searchParams.get('view') === 'map' ? points : points.slice(0, 30),
        hasMore: url.searchParams.get('view') !== 'map', mapApiKey: 'public-key',
      }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const onChange = vi.fn()
    render(<OzonDelivery {...baseProps} onChange={onChange} />)
    await waitFor(() => expect(objects.manager.add).toHaveBeenCalledTimes(1))
    expect(objects.manager.add.mock.calls[0][0].features).toHaveLength(80)
    expect(screen.getByText('На карте ПВЗ: 80.')).toBeVisible()
    expect(screen.queryByText(/Показаны первые 30 пунктов/)).not.toBeInTheDocument()
    act(() => objects.click(80))
    expect(screen.getByText(`Выбран пункт выдачи: ${points[79].address}`)).toBeVisible()
    fireEvent.click(screen.getByText('Рассчитать доставку Ozon'))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(selectedQuote))
    const confirmedCalls = onChange.mock.calls.length
    fireEvent.click(screen.getByText('Заполнить вручную'))
    const list = await screen.findByLabelText('Пункты выдачи Ozon')
    expect(list.children).toHaveLength(30)
    expect(screen.getByText(/Показаны первые 30 пунктов/)).toBeVisible()
    expect(screen.getByText(`Выбран пункт выдачи: ${points[79].address}`)).toBeVisible()
    expect(screen.getByText(/Доставка: 250/)).toBeVisible()
    expect(onChange).toHaveBeenCalledTimes(confirmedCalls)
    fireEvent.click(screen.getByText('Выбрать на карте'))
    await waitFor(() => expect(objects.manager.add).toHaveBeenCalledTimes(2))
    expect(objects.manager.add.mock.lastCall![0].features).toHaveLength(80)
    expect(objects.manager.objects.setObjectOptions).toHaveBeenLastCalledWith(80, { preset: 'islands#redIcon' })
    expect(onChange).toHaveBeenCalledTimes(confirmedCalls)
    const views = fetchMock.mock.calls.filter(([url]) => String(url).includes('/points?'))
      .map(([url]) => new URL(String(url), 'https://site').searchParams.get('view'))
    expect(views).toEqual(['map', null, 'map'])
  })

  it('ignores a late full-map search after switching to the bounded list', async () => {
    localStorage.removeItem('ozon-delivery-input-mode:inner')
    let finishMap!: (response: Response) => void
    const points = Array.from({ length: 80 }, (_, index) => ({ ...point, id: index + 1, name: `Пункт ${index + 1}` }))
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => new URL(String(input), 'https://site').searchParams.get('view') === 'map'
      ? new Promise<Response>(resolve => { finishMap = resolve })
      : new Response(JSON.stringify({ points: points.slice(0, 30), hasMore: true })))
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonDelivery {...baseProps} onChange={vi.fn()} />)
    await waitFor(() => expect(finishMap).toBeTypeOf('function'))
    fireEvent.click(screen.getByText('Заполнить вручную'))
    const list = await screen.findByLabelText('Пункты выдачи Ozon')
    expect(list.children).toHaveLength(30)
    await act(async () => finishMap(new Response(JSON.stringify({ points, hasMore: false }))))
    expect(list.children).toHaveLength(30)
    expect(screen.queryByText('Пункт 80')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Карта пунктов выдачи Ozon')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

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

  it('selects a verified CDN city point and calculates its quote through the origin', async () => {
    cdnConfig.url = 'https://cdn.example'
    vi.stubGlobal('crypto', webcrypto)
    const snapshot = JSON.stringify([point])
    const cityKey = createHash('sha256').update('москва').digest('hex')
    const contentHash = createHash('sha256').update(snapshot).digest('hex')
    const path = `/api/ozon-pvz/cities/inner/${contentHash}/${cityKey}.json`
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/ozon-pvz/manifest')) return new Response(JSON.stringify({
        schemaVersion: 1, brand: 'inner', city: 'москва', cityKey, publishedAt: new Date().toISOString(),
        entry: { path, totalCount: 1, updatedAt: new Date().toISOString() },
      }))
      if (url === `https://cdn.example${path}`) return new Response(snapshot)
      if (url.startsWith('/api/ozon-delivery/quote')) return new Response(JSON.stringify(quote))
      throw new Error('Unexpected point request')
    })
    vi.stubGlobal('fetch', fetchMock)
    const onChange = vi.fn()
    render(<OzonDelivery {...baseProps} onChange={onChange} />)
    await choosePoint()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/ozon-delivery/points'))).toBe(false)
    fireEvent.click(screen.getByText('Рассчитать доставку Ozon'))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(quote))
    expect(fetchMock.mock.calls[2][0]).toBe('/api/ozon-delivery/quote?brand=inner')
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
