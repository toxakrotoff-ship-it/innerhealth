import { describe, expect, it } from 'vitest'
import { adminOrderNotificationUrl, escapeDeliveryMarkdown, getOrderDeliveryDetails, getOrderDeliveryTitle } from './order-delivery-notification'

describe('order delivery notification presentation', () => {
  it.each([['ozon_pvz', 'OZON Доставка'], ['cdek_pvz', 'СДЭК'], ['cdek_door', 'СДЭК'], ['pickup', 'Самовывоз'], [null, null]])('labels %s as %s', (method, title) => {
    expect(getOrderDeliveryTitle(method)).toBe(title)
  })
  it('does not claim readiness while Ozon is pending and preserves its creation error', () => {
    const lines = getOrderDeliveryDetails({ deliveryMethod: 'ozon_pvz', ozonShipment: { orderNumber: null, postingNumber: null, status: 'pending', error: 'Повторите позже' } })
    expect(lines).toContain('Статус: Ожидает создания')
    expect(lines).toContain('Ошибка: Повторите позже')
    expect(lines.join('\n')).not.toContain('Готово к отгрузке')
  })
  it('ignores carrier identifiers left on pickup orders', () => {
    expect(getOrderDeliveryDetails({ deliveryMethod: 'pickup', cdekOrderUuid: 'stale', ozonShipment: { orderNumber: 'stale', postingNumber: 'stale', status: 'pending', error: null } })).toEqual([])
  })
  it('opens the matching storefront and exact public order search', () => {
    expect(adminOrderNotificationUrl({ orderId: 'internal', orderNumber: 352, brandId: 'sprint-power' })).toBe('https://sprintpower.ru/admin/orders?search=%23352')
    expect(adminOrderNotificationUrl({ orderId: 'legacy-order' })).toBe('https://innerhealth.ru/admin/orders?search=legacy-order')
  })
  it('escapes markup in provider values for MAX', () => {
    expect(escapeDeliveryMarkdown('*ПВЗ* [адрес] `id` <tag>')).toBe('\\*ПВЗ\\* \\[адрес\\] \\`id\\` \\<tag\\>')
  })
})
