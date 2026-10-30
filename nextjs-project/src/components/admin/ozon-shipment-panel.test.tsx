/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { OzonShipmentPanel } from './ozon-shipment-panel'

interface Shipment { postingNumber: string | null; orderNumber: string | null; status: string; error: string | null }

const pending: Shipment = { postingNumber: null, orderNumber: null, status: 'pending', error: null }
const created: Shipment = { postingNumber: 'posting-123', orderNumber: 'order-123', status: 'created', error: null }
const endpoint = '/api/admin/orders/order-123/ozon-shipment'

function mockApi(shipment: Shipment, updated: Shipment = shipment) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
    new Response(JSON.stringify({ shipment: init?.method === 'POST' ? updated : shipment })))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function expectAction(fetchMock: ReturnType<typeof mockApi>, action: string) {
  expect(fetchMock).toHaveBeenLastCalledWith(endpoint, expect.objectContaining({
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
  }))
}

describe('OzonShipmentPanel', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('retries creation after payment and shows automatic readiness confirmation', async () => {
    const fetchMock = mockApi(pending, { ...created, status: 'forming' })
    const { rerender } = render(<OzonShipmentPanel orderId="order-123" paid={false} />)
    expect(await screen.findByText('Ожидает создания')).toBeVisible()
    expect(screen.queryByText('Создать отправление Ozon')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    rerender(<OzonShipmentPanel orderId="order-123" paid />)
    fireEvent.click(screen.getByText('Создать отправление Ozon'))
    expectAction(fetchMock, 'create')
    expect(await screen.findByText('posting-123')).toBeVisible()
    expect(screen.getByText('Подтверждается')).toBeVisible()
    expect(screen.queryByText('Создать отправление Ozon')).not.toBeInTheDocument()
    expect(screen.queryByText('Подтвердить готовность к отгрузке')).not.toBeInTheDocument()
    expect(screen.getByText('Скачать этикетку')).toBeDisabled()
  })

  it('confirms readiness explicitly for a created posting', async () => {
    const fetchMock = mockApi(created, { ...created, status: 'ready_for_shipping' })
    render(<OzonShipmentPanel orderId="order-123" paid />)
    fireEvent.click(await screen.findByText('Подтвердить готовность к отгрузке'))
    expectAction(fetchMock, 'approve')
    expect(await screen.findByText('Готово к отгрузке')).toBeVisible()
    expect(screen.queryByText('Подтвердить готовность к отгрузке')).not.toBeInTheDocument()
    expect(screen.getByText('Скачать этикетку')).toBeEnabled()
  })

  it.each(['forming', 'ready_for_shipping', 'on_way', 'delivered', 'canceled'])('does not offer readiness confirmation for %s', async (status) => {
    mockApi({ ...created, status })
    render(<OzonShipmentPanel orderId="order-123" paid />)
    await screen.findByText('posting-123')
    expect(screen.queryByText('Подтвердить готовность к отгрузке')).not.toBeInTheDocument()
  })

  it('lets an administrator retry a failed readiness confirmation', async () => {
    const fetchMock = mockApi({ ...created, status: 'forming_failed' }, { ...created, status: 'forming' })
    render(<OzonShipmentPanel orderId="order-123" paid />)
    fireEvent.click(await screen.findByText('Подтвердить готовность к отгрузке'))
    expectAction(fetchMock, 'approve')
    expect(await screen.findByText('Подтверждается')).toBeVisible()
    expect(screen.getByText('Скачать этикетку')).toBeDisabled()
  })

  it('syncs a posting and shows its updated status and provider error', async () => {
    const fetchMock = mockApi(created, { ...created, status: 'on_way', error: 'Проверьте сопроводительные документы' })
    render(<OzonShipmentPanel orderId="order-123" paid />)
    fireEvent.click(await screen.findByText('Обновить статус Ozon'))
    expectAction(fetchMock, 'sync')
    expect(await screen.findByText('В пути')).toBeVisible()
    expect(screen.getByText('Проверьте сопроводительные документы')).toBeVisible()
  })

  it('shows API errors and releases controls after a failed action', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ shipment: created })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Сервис Ozon временно недоступен' }), { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonShipmentPanel orderId="order-123" paid />)
    fireEvent.click(await screen.findByText('Обновить статус Ozon'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Сервис Ozon временно недоступен')
    expect(screen.getByText('Обновить статус Ozon')).toBeEnabled()
    expect(screen.getByText('posting-123')).toBeVisible()
  })

  it('keeps action controls disabled while a mutation is pending', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ shipment: created })))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve })))
    render(<OzonShipmentPanel orderId="order-123" paid />)
    fireEvent.click(await screen.findByText('Обновить статус Ozon'))
    expect(screen.getByText('Обновить статус Ozon')).toBeDisabled()
    expect(screen.getByText('Подтвердить готовность к отгрузке')).toBeDisabled()
    finish(new Response(JSON.stringify({ shipment: created })))
    await waitFor(() => expect(screen.getByText('Обновить статус Ozon')).toBeEnabled())
  })

  it('shows load failures without offering an unchecked creation action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))
    render(<OzonShipmentPanel orderId="order-123" paid />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить отправление Ozon')
    expect(screen.queryByText('Создать отправление Ozon')).not.toBeInTheDocument()
  })

  it('does not offer mutation controls for an unpaid existing shipment', async () => {
    mockApi(created)
    render(<OzonShipmentPanel orderId="order-123" paid={false} />)
    expect(await screen.findByText('posting-123')).toBeVisible()
    expect(screen.queryByText('Обновить статус Ozon')).not.toBeInTheDocument()
    expect(screen.queryByText('Подтвердить готовность к отгрузке')).not.toBeInTheDocument()
    expect(screen.queryByText('Скачать этикетку')).not.toBeInTheDocument()
  })
})
