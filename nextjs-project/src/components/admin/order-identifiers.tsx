'use client'

import { useState } from 'react'
import { formatOrderLabel } from '@/lib/order-label'
import { ozonShipmentStatusLabels, type SearchableAdminOrder } from '@/lib/admin-order-navigation'

function CopyNumber({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState('')
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setMessage('Скопировано')
    } catch { setMessage('Не удалось скопировать') }
  }
  return <span className="inline-flex items-center gap-1">
    <button type="button" aria-label={`Скопировать ${label}`} title={`Скопировать ${label}`}
      className="rounded px-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-indigo-600" onClick={() => void copy()}>Копировать</button>
    {message ? <span role="status" className="text-xs text-gray-500">{message}</span> : null}
  </span>
}

export function OrderIdentifiers({ order, onOpen }: { order: SearchableAdminOrder; onOpen?: () => void }) {
  const label = formatOrderLabel({ orderId: order.id, orderNumber: order.orderNumber })
  const shipment = order.ozonShipment
  const isCdek = order.shippingInfo?.deliveryMethod === 'cdek_pvz' || order.shippingInfo?.deliveryMethod === 'cdek_door'
  return <div className="space-y-1 text-sm" aria-label="Номера заказа">
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 font-medium text-gray-800">
      {onOpen ? <button type="button" className="text-indigo-700 hover:underline" aria-label={`Открыть заказ ${label}`} onClick={onOpen}>{label}</button> : <span>{label}</span>}
      <CopyNumber key={order.orderNumber ?? order.id} value={order.orderNumber != null ? String(order.orderNumber) : order.id} label="номер заказа сайта" />
      {order.shippingInfo?.deliveryMethod === 'ozon_pvz' ? <>
        <span className="text-gray-400">·</span><span className="break-all">OZON: {shipment?.orderNumber || 'номер ещё не присвоен'}</span>
        {shipment?.orderNumber ? <CopyNumber key={shipment.orderNumber} value={shipment.orderNumber} label="номер заказа OZON" /> : null}
      </> : null}
      {isCdek ? <>
        <span className="text-gray-400">·</span><span className="break-all">СДЭК: {order.cdekTrackNumber || 'трек ещё не присвоен'}</span>
        {order.cdekTrackNumber ? <CopyNumber key={order.cdekTrackNumber} value={order.cdekTrackNumber} label="трек-номер СДЭК" /> : null}
      </> : null}
    </div>
    {order.shippingInfo?.deliveryMethod === 'ozon_pvz' ? <>
      {shipment?.postingNumber ? <div className="flex flex-wrap items-center gap-1 text-gray-600">
        <span className="break-all">Отправление OZON: <span className="font-mono">{shipment.postingNumber}</span></span>
        <CopyNumber key={shipment.postingNumber} value={shipment.postingNumber} label="номер отправления OZON" />
      </div> : null}
      <p className={shipment?.error || shipment?.status === 'canceled' || shipment?.status === 'forming_failed' ? 'text-amber-700' : 'text-gray-500'}>
        {shipment ? ozonShipmentStatusLabels[shipment.status] || shipment.status : 'Отправление ещё не создано'}
      </p>
    </> : isCdek ? <>
      {order.cdekOrderUuid ? <div className="flex flex-wrap items-center gap-1 text-gray-600">
        <span className="break-all">UUID СДЭК: <span className="font-mono">{order.cdekOrderUuid}</span></span>
        <CopyNumber key={order.cdekOrderUuid} value={order.cdekOrderUuid} label="UUID СДЭК" />
      </div> : null}
      {order.cdekOrderError ? <p className="text-amber-700">Ошибка создания отгрузки СДЭК</p>
        : !order.cdekOrderUuid && !order.cdekTrackNumber ? <p className="text-gray-500">Отгрузка СДЭК ещё не создана</p> : null}
      {order.cdekTrackNumber ? <a className="text-xs text-indigo-700 hover:underline" target="_blank" rel="noopener noreferrer"
        href={`https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(order.cdekTrackNumber)}`}>Отследить СДЭК</a> : null}
    </> : null}
  </div>
}
