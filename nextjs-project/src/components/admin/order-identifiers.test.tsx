/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { OrderIdentifiers } from './order-identifiers'

const order = {
  id: 'internal-order', orderNumber: 352, shippingInfo: { deliveryMethod: 'ozon_pvz' },
  ozonShipment: { orderNumber: 'AB-123CD', postingNumber: 'PP-123456', status: 'ready_for_shipping', error: null },
}

const setupComputedStyle = window.getComputedStyle
beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
    const style = setupComputedStyle(element)
    return Object.assign(style, { getPropertyValue: (name: string) => String(Reflect.get(style, name) || '') })
  })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('OrderIdentifiers', () => {
  it('distinguishes the site, Ozon order and posting numbers and opens the order card', () => {
    const open = vi.fn()
    render(<OrderIdentifiers order={order} onOpen={open} />)
    fireEvent.click(screen.getByRole('button', { name: 'Открыть заказ #352' }))
    expect(open).toHaveBeenCalledOnce()
    expect(screen.getByText('OZON: AB-123CD')).toBeVisible()
    expect(screen.getByText('Отправление OZON:')).toHaveTextContent('PP-123456')
    expect(screen.getByText('Готово к отгрузке')).toBeVisible()
    expect(screen.queryByText('internal-order')).not.toBeInTheDocument()
  })

  it.each([
    ['номер заказа сайта', '352'], ['номер заказа OZON', 'AB-123CD'], ['номер отправления OZON', 'PP-123456'],
  ])('copies only %s', async (label, value) => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<OrderIdentifiers order={order} />)
    fireEvent.click(screen.getByRole('button', { name: `Скопировать ${label}` }))
    expect(writeText).toHaveBeenCalledExactlyOnceWith(value)
    expect(await screen.findByRole('status')).toHaveTextContent('Скопировано')
  })

  it('reports clipboard failures instead of claiming the number was copied', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<OrderIdentifiers order={order} />)
    fireEvent.click(screen.getByRole('button', { name: 'Скопировать номер заказа OZON' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Не удалось скопировать')
  })

  it('shows Ozon delivery before provider numbers are assigned', () => {
    render(<OrderIdentifiers order={{ ...order, ozonShipment: null }} />)
    expect(screen.getByText('OZON: номер ещё не присвоен')).toBeVisible()
    expect(screen.getByText('Отправление ещё не создано')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Скопировать номер заказа OZON' })).not.toBeInTheDocument()
  })

  it.each(['cdek_pvz', 'cdek_door'])('shows and copies CDEK identifiers for %s', async deliveryMethod => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<OrderIdentifiers order={{ ...order, shippingInfo: { deliveryMethod }, cdekTrackNumber: '1234567890', cdekOrderUuid: 'cdek-uuid' }} />)
    expect(screen.getByText('СДЭК: 1234567890')).toBeVisible()
    expect(screen.queryByText('OZON: AB-123CD')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Скопировать трек-номер СДЭК' }))
    expect(writeText).toHaveBeenLastCalledWith('1234567890')
    fireEvent.click(screen.getByRole('button', { name: 'Скопировать UUID СДЭК' }))
    expect(writeText).toHaveBeenLastCalledWith('cdek-uuid')
    expect(screen.getByRole('link', { name: 'Отследить СДЭК' })).toHaveAttribute('href', 'https://www.cdek.ru/ru/tracking?order_id=1234567890')
  })

  it('shows CDEK before tracking is assigned and keeps its UUID available', () => {
    render(<OrderIdentifiers order={{ ...order, shippingInfo: { deliveryMethod: 'cdek_pvz' }, cdekOrderUuid: 'cdek-uuid' }} />)
    expect(screen.getByText('СДЭК: трек ещё не присвоен')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Скопировать UUID СДЭК' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Скопировать трек-номер СДЭК' })).not.toBeInTheDocument()
    expect(screen.queryByText('Отгрузка СДЭК ещё не создана')).not.toBeInTheDocument()
  })

  it('distinguishes a missing CDEK shipment from a failed creation', () => {
    const cdek = { ...order, shippingInfo: { deliveryMethod: 'cdek_pvz' } }
    const { rerender } = render(<OrderIdentifiers order={cdek} />)
    expect(screen.getByText('Отгрузка СДЭК ещё не создана')).toBeVisible()
    rerender(<OrderIdentifiers order={{ ...cdek, cdekOrderError: 'provider unavailable' }} />)
    expect(screen.getByText('Ошибка создания отгрузки СДЭК')).toBeVisible()
    expect(screen.queryByText('Отгрузка СДЭК ещё не создана')).not.toBeInTheDocument()
  })

  it.each(['ozon_pvz', 'pickup'])('does not show stale CDEK identifiers for %s', deliveryMethod => {
    render(<OrderIdentifiers order={{ ...order, shippingInfo: { deliveryMethod }, cdekTrackNumber: 'stale-cdek', cdekOrderUuid: 'stale-uuid' }} />)
    expect(screen.queryByText(/stale-cdek|stale-uuid/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Отследить СДЭК' })).not.toBeInTheDocument()
  })
})
