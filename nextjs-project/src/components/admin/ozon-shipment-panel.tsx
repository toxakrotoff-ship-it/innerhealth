'use client'

import { useEffect, useRef, useState } from 'react'
import { ozonShipmentStatusLabels, type AdminOzonShipmentSummary } from '@/lib/admin-order-navigation'

type Shipment = AdminOzonShipmentSummary

export function OzonShipmentPanel({ orderId, paid, onShipmentChange }: {
  orderId: string; paid: boolean; onShipmentChange?: (orderId: string, shipment: Shipment) => void
}) {
  const changeRef = useRef(onShipmentChange)
  useEffect(() => { changeRef.current = onShipmentChange }, [onShipmentChange])
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const url = `/api/admin/orders/${encodeURIComponent(orderId)}/ozon-shipment`
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true)
    setError(null)
    setShipment(null)
    fetch(url, { cache: 'no-store', signal: controller.signal }).then(async res => {
      if (!res.ok) throw new Error('Не удалось загрузить отправление Ozon')
      const data = await res.json()
      if (controller.signal.aborted) return
      setShipment(data.shipment)
      if (data.shipment) changeRef.current?.(orderId, data.shipment)
      if (paid && data.shipment?.postingNumber) {
        const synced = await fetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync' }), signal: controller.signal,
        })
        const current = await synced.json()
        if (!synced.ok) throw new Error(current.error || 'Не удалось обновить статус Ozon')
        if (!controller.signal.aborted) {
          setShipment(current.shipment)
          if (current.shipment) changeRef.current?.(orderId, current.shipment)
        }
      }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [url, paid, orderId])

  async function run(action: 'create' | 'sync' | 'approve' | 'label') {
    setBusy(true); setError(null)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Ошибка Ozon') }
      if (action === 'label') {
        const blobUrl = URL.createObjectURL(await res.blob())
        const link = document.createElement('a'); link.href = blobUrl; link.download = `ozon-${shipment?.postingNumber || orderId}.pdf`; link.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      } else {
        const data = await res.json(); setShipment(data.shipment)
        if (data.shipment) changeRef.current?.(orderId, data.shipment)
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка Ozon') }
    finally { setBusy(false) }
  }
  const buttonClass = 'text-sm font-medium text-indigo-600 disabled:opacity-50'
  return <section aria-label="Отправление Ozon" className="mt-4 border-t border-gray-200 pt-3 space-y-2">
    <h3 className="text-sm font-semibold">Ozon Доставка</h3>
    {busy && shipment?.postingNumber ? <p role="status" className="text-sm text-gray-500">Обновляем статус Ozon…</p> : null}
    {shipment ? <>
      <p className="text-sm">{ozonShipmentStatusLabels[shipment.status] || shipment.status}</p>
      {shipment.orderNumber ? <p className="text-sm">Заказ OZON: <span className="font-mono">{shipment.orderNumber}</span></p> : null}
      {shipment.postingNumber ? <p className="text-sm">Отправление OZON: <span className="font-mono">{shipment.postingNumber}</span></p> : null}
      {shipment.error ? <p className="text-sm text-amber-700">{shipment.error}</p> : null}
    </> : <p className="text-sm">{busy ? 'Загрузка…' : 'Отправление ещё не создано'}</p>}
    {paid && shipment ? <div className="flex flex-wrap gap-3">
      {!shipment.postingNumber ? <button type="button" disabled={busy} className={buttonClass} onClick={() => void run('create')}>Создать отправление Ozon</button> : <>
        <button type="button" disabled={busy} className={buttonClass} onClick={() => void run('sync')}>Обновить статус Ozon</button>
        {['created', 'forming_failed'].includes(shipment.status) ? <button type="button" disabled={busy} className={buttonClass} onClick={() => void run('approve')}>Подтвердить готовность к отгрузке</button> : null}
        <button type="button" disabled={busy || ['created', 'forming', 'forming_failed'].includes(shipment.status)} className={buttonClass} onClick={() => void run('label')}>Скачать этикетку</button>
      </>}
    </div> : null}
    {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
  </section>
}
