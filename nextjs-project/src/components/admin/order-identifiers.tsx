'use client'

import { useState } from 'react'
import { formatOrderLabel } from '@/lib/order-label'
import { ozonShipmentStatusLabels, type SearchableAdminOrder } from '@/lib/admin-order-navigation'

const secondaryActionClass = 'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

function CopyIcon() {
  return <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
}

function CopyNumber({ value, label, text }: { value: string; label: string; text: string }) {
  const [message, setMessage] = useState('')
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setMessage('Скопировано')
    } catch { setMessage('Не удалось скопировать') }
  }
  return <span className="inline-flex max-w-full flex-wrap items-center gap-2">
    <button type="button" aria-label={`Скопировать ${label}`} title={`Скопировать ${label}`}
      className={secondaryActionClass} onClick={() => void copy()}><CopyIcon />{text}</button>
    {message ? <span role="status" className="text-xs text-gray-500">{message}</span> : null}
  </span>
}

export function OrderIdentifiers({ order, onOpen }: { order: SearchableAdminOrder; onOpen?: () => void }) {
  const label = formatOrderLabel({ orderId: order.id, orderNumber: order.orderNumber })
  const shipment = order.ozonShipment
  const isCdek = order.shippingInfo?.deliveryMethod === 'cdek_pvz' || order.shippingInfo?.deliveryMethod === 'cdek_door'
  return <div className="space-y-2 text-sm" aria-label="Номера заказа">
    <div className="flex flex-wrap items-center gap-2 font-medium text-gray-800">
      {onOpen ? <button type="button" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:border-indigo-700 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" aria-label={`Открыть заказ ${label}`} onClick={onOpen}>Открыть {label}</button> : <span>{label}</span>}
      <CopyNumber key={order.orderNumber ?? order.id} value={order.orderNumber != null ? String(order.orderNumber) : order.id} label="номер заказа сайта" text="Скопировать № сайта" />
    </div>
    {order.shippingInfo?.deliveryMethod === 'ozon_pvz' || isCdek ? <div className="flex flex-wrap items-center gap-2 font-medium text-gray-800">
      {order.shippingInfo?.deliveryMethod === 'ozon_pvz' ? <>
        <span className="min-w-0 break-all">OZON: {shipment?.orderNumber || 'номер ещё не присвоен'}</span>
        {shipment?.orderNumber ? <CopyNumber key={shipment.orderNumber} value={shipment.orderNumber} label="номер заказа OZON" text="Скопировать № OZON" /> : null}
      </> : null}
      {isCdek ? <>
        <span className="min-w-0 break-all">СДЭК: {order.cdekTrackNumber || 'трек ещё не присвоен'}</span>
        {order.cdekTrackNumber ? <CopyNumber key={order.cdekTrackNumber} value={order.cdekTrackNumber} label="трек-номер СДЭК" text="Скопировать трек" /> : null}
      </> : null}
    </div> : null}
    {order.shippingInfo?.deliveryMethod === 'ozon_pvz' ? <>
      {shipment?.postingNumber ? <div className="flex flex-wrap items-center gap-2 text-gray-600">
        <span className="min-w-0 break-all">Отправление OZON: <span className="font-mono">{shipment.postingNumber}</span></span>
        <CopyNumber key={shipment.postingNumber} value={shipment.postingNumber} label="номер отправления OZON" text="Скопировать отправление" />
      </div> : null}
      <p className={shipment?.error || shipment?.status === 'canceled' || shipment?.status === 'forming_failed' ? 'text-amber-700' : 'text-gray-500'}>
        {shipment ? ozonShipmentStatusLabels[shipment.status] || shipment.status : 'Отправление ещё не создано'}
      </p>
    </> : isCdek ? <>
      {order.cdekOrderUuid ? <div className="flex flex-wrap items-center gap-2 text-gray-600">
        <span className="min-w-0 break-all">UUID СДЭК: <span className="font-mono">{order.cdekOrderUuid}</span></span>
        <CopyNumber key={order.cdekOrderUuid} value={order.cdekOrderUuid} label="UUID СДЭК" text="Скопировать UUID" />
      </div> : null}
      {order.cdekOrderError ? <p className="text-amber-700">Ошибка создания отгрузки СДЭК</p>
        : !order.cdekOrderUuid && !order.cdekTrackNumber ? <p className="text-gray-500">Отгрузка СДЭК ещё не создана</p> : null}
      {order.cdekTrackNumber ? <a className={secondaryActionClass} target="_blank" rel="noopener noreferrer"
        href={`https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(order.cdekTrackNumber)}`}>Отследить СДЭК<svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg></a> : null}
    </> : null}
  </div>
}
