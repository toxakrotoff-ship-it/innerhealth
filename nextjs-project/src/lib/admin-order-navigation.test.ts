import { describe, expect, it } from 'vitest'
import { matchesDeliveryFilter, matchesOrderSearch, type SearchableAdminOrder } from './admin-order-navigation'

const order: SearchableAdminOrder = {
  id: 'internal-order-abc', orderNumber: 352,
  shippingInfo: { fullName: 'Иван Петров', phoneRaw: '+7 (999) 123-45-67', phoneMasked: '+7 *** 123-45-67', deliveryMethod: 'ozon_pvz' },
  ozonShipment: { orderNumber: 'AB-123CD456-78EF', postingNumber: 'PP1234AB56CD-789E', status: 'ready_for_shipping', error: null },
  cdekTrackNumber: '1234567890', cdekOrderUuid: '11111111-2222-3333-4444-555555555555', yookassaPaymentId: 'payment-example',
}

describe('CRM order search', () => {
  it.each(['352', '#352', '№352', '№ 352', 'ab-123cd456-78ef', 'AB123CD45678EF', 'AB—123CD456—78EF',
    '123CD', 'PP1234AB56CD789E', 'pp1234ab56cd-789e', '1234567890', '11111111222233334444555555555555',
    'payment-example', 'ИВАН ПЕТРОВ', '+7 (999) 123-45-67', '9991234567', 'internal-order-abc', '  '])('finds an order by %s', query => {
    expect(matchesOrderSearch(order, query)).toBe(true)
  })
  it.each(['AB9991234567', 'NONEXISTENT', '№9999', '— —'])('does not match unrelated identifiers %s', query => {
    expect(matchesOrderSearch(order, query)).toBe(false)
  })
  it('handles orders without delivery or provider numbers', () => {
    const pending = { id: 'pending', orderNumber: 353, ozonShipment: null, shippingInfo: null }
    expect(matchesOrderSearch(pending, '№353')).toBe(true)
    expect(matchesOrderSearch(pending, 'AB123CD')).toBe(false)
  })
  it('combines delivery selection without treating cdek door delivery as another provider', () => {
    expect(matchesDeliveryFilter(order, 'ozon')).toBe(true)
    expect(matchesDeliveryFilter(order, 'cdek')).toBe(false)
    expect(matchesDeliveryFilter({ ...order, shippingInfo: { deliveryMethod: 'cdek_door' } }, 'cdek')).toBe(true)
    expect(matchesDeliveryFilter({ id: 'no-shipping' }, 'all')).toBe(true)
    expect(matchesDeliveryFilter({ ...order, shippingInfo: { deliveryMethod: 'pickup' } }, 'pickup')).toBe(true)
  })
})
