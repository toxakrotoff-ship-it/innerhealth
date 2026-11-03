import type { BrandId } from '@/lib/brand/brand'
import { getBrandSiteUrl } from '@/lib/brand/site-branding'
import { formatOrderLabel } from '@/lib/order-label'
import { ozonShipmentStatusLabels, type AdminOzonShipmentSummary } from '@/lib/admin-order-navigation'

export interface OrderDeliveryNotifyPayload {
  deliveryMethod?: string | null
  cdekTrackNumber?: string | null
  cdekOrderUuid?: string | null
  cdekOrderError?: string | null
  ozonShipment?: AdminOzonShipmentSummary | null
  shipping?: { address: string }
}

export function getOrderDeliveryTitle(method?: string | null): string | null {
  if (method === 'ozon_pvz') return 'OZON Доставка'
  if (method === 'cdek_pvz' || method === 'cdek_door') return 'СДЭК'
  return method === 'pickup' ? 'Самовывоз' : null
}

/** Plain text values; each messenger escapes them for its own markup format. */
export function getOrderDeliveryDetails(payload: OrderDeliveryNotifyPayload): string[] {
  if (payload.deliveryMethod === 'ozon_pvz') {
    const shipment = payload.ozonShipment
    return [
      'Способ: ПВЗ',
      payload.shipping?.address ? `ПВЗ: ${payload.shipping.address}` : '',
      shipment?.orderNumber ? `Заказ OZON: ${shipment.orderNumber}` : '',
      shipment?.postingNumber ? `Отправление OZON: ${shipment.postingNumber}` : '',
      shipment ? `Статус: ${ozonShipmentStatusLabels[shipment.status] || shipment.status}` : 'Отправление ещё не создано',
      shipment?.error ? `Ошибка: ${shipment.error}` : '',
    ].filter(Boolean)
  }
  if (payload.deliveryMethod === 'cdek_pvz' || payload.deliveryMethod === 'cdek_door') {
    return [
      `Способ: ${payload.deliveryMethod === 'cdek_pvz' ? 'ПВЗ' : 'до двери'}`,
      payload.cdekTrackNumber ? `Трек СДЭК: ${payload.cdekTrackNumber}` : '',
      payload.cdekOrderUuid ? `UUID СДЭК: ${payload.cdekOrderUuid}` : '',
      payload.cdekOrderError ? `Ошибка: ${payload.cdekOrderError}` : '',
      !payload.cdekOrderUuid && !payload.cdekTrackNumber ? 'Отгрузка ещё не создана'
        : !payload.cdekTrackNumber ? 'Трек-номер ещё не присвоен' : '',
    ].filter(Boolean)
  }
  return []
}

export function adminOrderNotificationUrl(payload: { orderId: string; orderNumber?: number | null; brandId?: BrandId }): string {
  return `${getBrandSiteUrl(payload.brandId ?? 'inner').replace(/\/$/, '')}/admin/orders?search=${encodeURIComponent(formatOrderLabel(payload))}`
}

export function escapeDeliveryMarkdown(value: string): string {
  return value.replace(/([\\`*_~[\]()<>])/g, '\\$1')
}
