import { formatOrderLabel } from '@/lib/order-label'

export interface AdminOzonShipmentSummary {
  orderNumber: string | null
  postingNumber: string | null
  status: string
  error: string | null
}

export const ozonShipmentStatusLabels: Record<string, string> = {
  pending: 'Ожидает создания', created: 'Создано, требуется подтверждение готовности', forming: 'Подтверждается',
  forming_failed: 'Ошибка подтверждения', ready_for_shipping: 'Готово к отгрузке', on_way: 'В пути',
  in_delivery_point: 'В пункте выдачи', delivered: 'Доставлено', canceled: 'Отменено',
}

export interface SearchableAdminOrder {
  id: string
  orderNumber?: number | null
  ozonShipment?: AdminOzonShipmentSummary | null
  cdekTrackNumber?: string | null
  cdekOrderUuid?: string | null
  cdekOrderError?: string | null
  yookassaPaymentId?: string | null
  shippingInfo?: {
    fullName?: string | null
    phoneRaw?: string | null
    phoneMasked?: string | null
    deliveryMethod?: string | null
  } | null
}

export type AdminDeliveryFilter = 'all' | 'ozon' | 'cdek' | 'pickup'

function normalizeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[\s\-‐‑‒–—−]+/g, '')
}

export function matchesOrderSearch(order: SearchableAdminOrder, rawTerm: string): boolean {
  const term = rawTerm.trim()
  if (!term) return true
  const lower = term.toLowerCase()
  const number = term.replace(/^[#№]\s*/, '')
  if (/^\d+$/.test(number) && order.orderNumber != null && String(order.orderNumber).includes(number)) return true
  if (order.id.toLowerCase().includes(lower)
    || formatOrderLabel({ orderId: order.id, orderNumber: order.orderNumber }).toLowerCase().includes(lower)
    || order.shippingInfo?.fullName?.toLowerCase().includes(lower)) return true
  const normalized = normalizeIdentifier(term)
  if (normalized && [order.ozonShipment?.orderNumber, order.ozonShipment?.postingNumber,
    order.cdekTrackNumber, order.cdekOrderUuid, order.yookassaPaymentId]
    .some(value => value && normalizeIdentifier(value).includes(normalized))) return true
  // A carrier code containing letters must not match an unrelated phone by its digits.
  if (/^[+\d\s().-]+$/.test(term)) {
    const digits = term.replace(/\D/g, '')
    return Boolean(digits && order.shippingInfo?.phoneRaw?.replace(/\D/g, '').includes(digits))
  }
  return Boolean(order.shippingInfo?.phoneMasked?.includes(term))
}

export function matchesDeliveryFilter(order: SearchableAdminOrder, filter: AdminDeliveryFilter): boolean {
  const method = order.shippingInfo?.deliveryMethod
  return filter === 'all' || (filter === 'ozon' && method === 'ozon_pvz')
    || (filter === 'cdek' && (method === 'cdek_pvz' || method === 'cdek_door'))
    || (filter === 'pickup' && method === 'pickup')
}
