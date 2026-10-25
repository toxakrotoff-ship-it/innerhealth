'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/button'

type SettingsScope = 'global' | 'inner' | 'sprint-power'
type Settings = {
  ozon_enabled: string
  ozon_client_id: string
  ozon_client_secret: string
  ozon_shipment_method_id: string
  ozon_handling_hours: string
}
interface SettingsResponse { settings: Settings; hasClientSecret: boolean }
const scopeLabels: Record<SettingsScope, string> = { global: 'Global', inner: 'Inner Health', 'sprint-power': 'Sprint Power' }

function normalizeSettings(data: SettingsResponse): Settings {
  if (!data.settings || typeof data.settings !== 'object') throw new Error('Не удалось загрузить настройки Ozon')
  return {
    ozon_enabled: data.settings.ozon_enabled === '1' ? '1' : '0',
    ozon_client_id: data.settings.ozon_client_id || '',
    ozon_client_secret: '',
    ozon_shipment_method_id: data.settings.ozon_shipment_method_id || '',
    ozon_handling_hours: data.settings.ozon_handling_hours || '24',
  }
}

// Remounting isolates credentials, pending requests and form state when the scope changes.
export function OzonSettingsPanel({ scope }: { scope: SettingsScope }) {
  return <ScopedOzonSettingsPanel key={scope} scope={scope} />
}

function ScopedOzonSettingsPanel({ scope }: { scope: SettingsScope }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState<Settings | null>(null)
  const [hasClientSecret, setHasClientSecret] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const operation = useRef<AbortController | null>(null)
  const query = scope === 'global' ? '' : `?brand=${encodeURIComponent(scope)}`
  const endpoint = `/api/admin/ozon-delivery/settings${query}`
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch(endpoint, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить настройки Ozon')
      const values = normalizeSettings(data)
      if (controller.signal.aborted) return
      setSettings(values)
      setSaved(values)
      setHasClientSecret(data.hasClientSecret === true)
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить настройки Ozon')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); operation.current?.abort() }
  }, [endpoint, loadAttempt])

  function update(key: keyof Settings, value: string) {
    setSettings(previous => previous ? { ...previous, [key]: value } : previous)
    setMessage(null)
  }

  async function save(applyToBoth = false) {
    if (!settings || busy) return
    const controller = new AbortController()
    operation.current = controller
    setBusy(true); setError(null); setMessage(null)
    const payload: Record<string, string> = { ...settings }
    if (!payload.ozon_client_secret.trim()) delete payload.ozon_client_secret
    try {
      const response = await fetch(endpoint, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ settings: payload, ...(applyToBoth ? { applyToBoth: true } : {}) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить настройки Ozon')
      const values = normalizeSettings(data)
      if (controller.signal.aborted) return
      setSettings(values); setSaved(values); setHasClientSecret(data.hasClientSecret === true)
      setMessage(applyToBoth ? 'Настройки Ozon сохранены для обеих витрин.' : 'Настройки Ozon сохранены.')
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Не удалось сохранить настройки Ozon')
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }

  async function run(action: 'check' | 'points-sync') {
    if (busy || dirty || !settings) return
    const controller = new AbortController()
    operation.current = controller
    setBusy(true); setError(null); setMessage(null)
    try {
      const response = await fetch(`/api/admin/ozon-delivery/${action}${query}`, { method: 'POST', signal: controller.signal })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.ok !== true) throw new Error(data.error || 'Не удалось выполнить запрос Ozon')
      if (controller.signal.aborted) return
      if (action === 'check') setMessage('Подключение к Ozon проверено.')
      else {
        const results = (data.results || []) as Array<{ brand: 'inner' | 'sprint-power'; skipped: boolean; points: number }>
        setMessage(`Обновление ПВЗ: ${results.map(result => `${scopeLabels[result.brand] || result.brand} — ${result.skipped ? 'пропущено (доставка выключена)' : `${result.points} пунктов`}`).join('; ')}.`)
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Не удалось выполнить запрос Ozon')
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }

  return <section aria-label="Настройки Ozon Доставки" className="card mb-8 space-y-4">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Ozon Доставка</h2>
      <p className="text-sm text-gray-600">Ключи, включение доставки и настройки API — {scopeLabels[scope]}.</p>
    </div>
    {loading ? <p className="text-sm text-gray-500">Загрузка настроек Ozon…</p> : settings ? <form onSubmit={event => { event.preventDefault(); void save() }} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" role="switch" aria-checked={settings.ozon_enabled === '1'} aria-label="Ozon Доставка" disabled={busy}
          onClick={() => update('ozon_enabled', settings.ozon_enabled === '1' ? '0' : '1')}
          className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 ${settings.ozon_enabled === '1' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
          {settings.ozon_enabled === '1' ? 'ВКЛ' : 'ВЫКЛ'}
        </button>
        <span className="text-xs text-gray-600">Переключатель применяется после сохранения.</span>
      </div>
      <fieldset disabled={busy} className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">Client ID
          <input className="form-input block w-full" type="text" autoComplete="off" value={settings.ozon_client_id} onChange={event => update('ozon_client_id', event.target.value)} />
        </label>
        <div className="space-y-1">
          <label className="space-y-1 text-sm">Client Secret
            <input className="form-input block w-full" type="password" autoComplete="new-password" value={settings.ozon_client_secret}
              placeholder={hasClientSecret ? 'Секрет сохранён' : 'Введите Client Secret'} onChange={event => update('ozon_client_secret', event.target.value)} />
          </label>
          <p className="text-xs text-gray-500">Пустое поле сохраняет действующий секрет, в том числе унаследованный из Global.</p>
        </div>
        <label className="space-y-1 text-sm">ID метода доставки
          <input className="form-input block w-full" type="number" min="1" step="1" value={settings.ozon_shipment_method_id} onChange={event => update('ozon_shipment_method_id', event.target.value)} />
        </label>
        <label className="space-y-1 text-sm">Плановый срок отгрузки, часы
          <input className="form-input block w-full" type="number" min="1" max="168" step="1" required value={settings.ozon_handling_hours} onChange={event => update('ozon_handling_hours', event.target.value)} />
        </label>
      </fieldset>
      {scope === 'global' ? <p className="text-xs text-gray-600">Обычное сохранение задаёт общие настройки. Кнопка «Сохранить для обеих витрин» также заменяет отдельные настройки Inner Health и Sprint Power, включая ключи и переключатель доставки.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>Сохранить Ozon</Button>
        {scope === 'global' ? <Button type="button" variant="outline" size="sm" disabled={busy} onClick={event => {
          if (event.currentTarget.form?.reportValidity()) void save(true)
        }}>Сохранить для обеих витрин</Button> : null}
      </div>
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <p className="text-xs text-gray-600">Проверка API и обновление ПВЗ используют сохранённые настройки. {dirty ? 'Сначала сохраните изменения.' : 'Перед запуском сохраните изменения, если они есть.'}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy || dirty} onClick={() => void run('check')}>Проверить API Ozon</Button>
          <Button type="button" variant="outline" size="sm" disabled={busy || dirty} onClick={() => void run('points-sync')}>Обновить ПВЗ Ozon</Button>
        </div>
      </div>
      {dirty ? <p className="text-xs text-amber-700">Есть несохранённые изменения Ozon.</p> : null}
      {busy ? <p role="status" className="text-sm text-gray-500">Выполняется запрос Ozon…</p> : null}
    </form> : <Button type="button" variant="outline" size="sm" onClick={() => setLoadAttempt(previous => previous + 1)}>Повторить загрузку Ozon</Button>}
    {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    {message ? <p role="status" className="text-sm text-green-700">{message}</p> : null}
  </section>
}
