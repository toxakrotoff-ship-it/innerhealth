'use client'

import { useEffect, useState } from 'react'

interface Shipment { postingNumber: string | null; orderNumber: string | null; status: string; error: string | null }
const statusLabels: Record<string, string> = {
  pending: 'Ожидает создания', created: 'Создано, требуется подтверждение готовности', forming: 'Подтверждается',
  forming_failed: 'Ошибка подтверждения', ready_for_shipping: 'Готово к отгрузке', on_way: 'В пути',
  in_delivery_point: 'В пункте выдачи', delivered: 'Доставлено', canceled: 'Отменено',
}

export function OzonShipmentPanel({ orderId, paid }: { orderId: string; paid: boolean }) {
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const url = `/api/admin/orders/${encodeURIComponent(orderId)}/ozon-shipment`
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true)
    fetch(url, { cache: 'no-store', signal: controller.signal }).then(async res => {
      if (!res.ok) throw new Error('Не удалось загрузить отправление Ozon')
      const data = await res.json()
      if (!controller.signal.aborted) setShipment(data.shipment)
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message) })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [url])

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
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Ошибка Ozon') }
    finally { setBusy(false) }
  }
  const buttonClass = 'text-sm font-medium text-indigo-600 disabled:opacity-50'
  return <section aria-label="Отправление Ozon" className="mt-4 border-t border-gray-200 pt-3 space-y-2">
    <h3 className="text-sm font-semibold">Ozon Доставка</h3>
    {shipment ? <>
      <p className="text-sm">{statusLabels[shipment.status] || shipment.status}</p>
      {shipment.postingNumber ? <p className="text-sm">Номер отправления: <span className="font-mono">{shipment.postingNumber}</span></p> : null}
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
