/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import OrdersPage from './page'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }))
vi.mock('@/components/admin/order-financial-breakdown', () => ({
  OrderFinancialBreakdownPanel: () => <div>Сумма заказа</div>, OrderFinancialCompactSummary: () => <div>Итого</div>,
}))
vi.mock('@/components/admin/ozon-shipment-panel', () => ({ OzonShipmentPanel: ({ orderId, onShipmentChange }: {
  orderId: string; onShipmentChange: (id: string, shipment: unknown) => void
}) => <button onClick={() => onShipmentChange(orderId, { orderNumber: 'NEW-OZON-123', postingNumber: 'NEW-POSTING-456', status: 'ready_for_shipping', error: null })}>Обновить номера теста</button> }))

const rows = [
  { id: 'ozon-order', orderNumber: 352, shippingInfo: { fullName: 'Покупатель OZON', deliveryMethod: 'ozon_pvz' },
    ozonShipment: { orderNumber: 'AB-123CD', postingNumber: 'PP-456EF', status: 'ready_for_shipping', error: null } },
  { id: 'cdek-order', orderNumber: 353, shippingInfo: { fullName: 'Покупатель СДЭК', deliveryMethod: 'cdek_door' }, cdekTrackNumber: '1234567890' },
].map(order => ({ ...order, createdAt: '2026-10-28T05:00:00Z', status: 'paid', total: 1000, financials: {}, promoCode: null }))
const setupComputedStyle = window.getComputedStyle
beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
    const style = setupComputedStyle(element)
    return Object.assign(style, { getPropertyValue: (name: string) => String(Reflect.get(style, name) || '') })
  })
  vi.stubGlobal('fetch', vi.fn(async (input: string) => new Response(JSON.stringify(
    input === '/api/admin/orders?mode=active' ? rows : { ...rows[0], items: [] }
  ))))
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('CRM order navigation', () => {
  it('searches by the Ozon order and posting numbers while orders remain collapsed', async () => {
    render(<OrdersPage />)
    await screen.findByText('Найдено заказов: 2 из 2')
    fireEvent.change(screen.getByLabelText('Поиск заказа'), { target: { value: 'pp456ef' } })
    expect(screen.getByText('Найдено заказов: 1 из 2')).toBeVisible()
    expect(screen.queryByText('Покупатель СДЭК')).not.toBeInTheDocument()
    expect(screen.getAllByText('OZON: AB-123CD')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Поиск заказа'), { target: { value: 'ab123cd' } })
    expect(screen.getByText('Найдено заказов: 1 из 2')).toBeVisible()
  })

  it('filters delivery methods and clears both controls when no orders match', async () => {
    render(<OrdersPage />)
    await screen.findByText('Найдено заказов: 2 из 2')
    fireEvent.change(screen.getByLabelText('Доставка'), { target: { value: 'cdek' } })
    expect(screen.queryByText('Покупатель OZON')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Поиск заказа'), { target: { value: 'нет такого заказа' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить поиск и фильтр' }))
    expect(screen.getByText('Найдено заказов: 2 из 2')).toBeVisible()
    expect(screen.getByLabelText('Доставка')).toHaveValue('all')
  })

  it('opens the card from the site number and makes synchronized numbers searchable immediately', async () => {
    render(<OrdersPage />)
    await screen.findByText('Найдено заказов: 2 из 2')
    fireEvent.click(screen.getAllByRole('button', { name: 'Открыть заказ #352' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Карточка заказа #352' })
    await waitFor(() => expect(within(dialog).queryByText('Загрузка состава заказа...')).not.toBeInTheDocument())
    fireEvent.click(within(dialog).getByRole('button', { name: 'Обновить номера теста' }))
    expect(within(dialog).getByText('OZON: NEW-OZON-123')).toBeVisible()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Закрыть' }))
    fireEvent.change(screen.getByLabelText('Поиск заказа'), { target: { value: 'newposting456' } })
    expect(screen.getByText('Найдено заказов: 1 из 2')).toBeVisible()
    expect(screen.getAllByText('OZON: NEW-OZON-123')).toHaveLength(2)
  })
})
