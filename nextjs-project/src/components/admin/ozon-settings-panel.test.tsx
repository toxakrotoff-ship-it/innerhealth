/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OzonSettingsPanel } from './ozon-settings-panel'

const defaultSettings = {
  ozon_enabled: '0', ozon_client_id: 'example-client', ozon_client_secret: '',
  ozon_shipment_method_id: '123', ozon_handling_hours: '24',
}
function response(settings = defaultSettings, hasClientSecret = true) {
  return new Response(JSON.stringify({ settings, hasClientSecret }))
}
function mockApi() {
  const fetchMock = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      const { settings } = JSON.parse(init.body as string)
      return response({ ...defaultSettings, ...settings, ozon_client_secret: '' })
    }
    return response()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
// The shared setup spreads CSSStyleDeclaration, which drops getPropertyValue.
const setupComputedStyle = window.getComputedStyle
beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
    const style = setupComputedStyle(element)
    return Object.assign(style, { getPropertyValue: (name: string) => String(Reflect.get(style, name) || '') })
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('OzonSettingsPanel', () => {
  it.each([
    ['global', ''], ['inner', '?brand=inner'], ['sprint-power', '?brand=sprint-power'],
  ] as const)('loads and saves %s settings through its own endpoint', async (scope, suffix) => {
    const fetchMock = mockApi()
    render(<OzonSettingsPanel scope={scope} />)
    expect(await screen.findByLabelText('Client ID')).toHaveValue('example-client')
    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/ozon-delivery/settings${suffix}`, expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }))
    fireEvent.click(screen.getByRole('switch', { name: 'Ozon Доставка' }))
    expect(screen.getByRole('switch')).toBeChecked()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('ID метода доставки'), { target: { value: '456' } })
    fireEvent.change(screen.getByLabelText('Плановый срок отгрузки, часы'), { target: { value: '48' } })
    fireEvent.change(screen.getByLabelText('Client Secret'), { target: { value: 'example-replacement' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить Ozon' }))
    await screen.findByText('Настройки Ozon сохранены.')
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/admin/ozon-delivery/settings${suffix}`, expect.objectContaining({
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { ...defaultSettings, ozon_enabled: '1', ozon_client_secret: 'example-replacement', ozon_shipment_method_id: '456', ozon_handling_hours: '48' } }),
    }))
    expect(screen.getByLabelText('Client Secret')).toHaveValue('')
    expect(screen.getByLabelText('Client Secret')).toHaveAttribute('placeholder', 'Секрет сохранён')
    expect(screen.getByRole('button', { name: 'Проверить API Ozon' })).toBeEnabled()
    if (scope !== 'global') expect(screen.queryByRole('button', { name: 'Сохранить для обеих витрин' })).not.toBeInTheDocument()
  })

  it('omits a blank secret to preserve the saved or inherited secret', async () => {
    const fetchMock = mockApi()
    render(<OzonSettingsPanel scope="inner" />)
    await screen.findByLabelText('Client ID')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить Ozon' }))
    await screen.findByText('Настройки Ozon сохранены.')
    const payload = JSON.parse(fetchMock.mock.calls.at(-1)![1]!.body as string)
    expect(payload.settings).not.toHaveProperty('ozon_client_secret')
    expect(payload).not.toHaveProperty('applyToBoth')
  })

  it('applies Global settings to both storefronts only through the explicit button', async () => {
    const fetchMock = mockApi()
    render(<OzonSettingsPanel scope="global" />)
    await screen.findByLabelText('Client ID')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить для обеих витрин' }))
    await screen.findByText('Настройки Ozon сохранены для обеих витрин.')
    expect(JSON.parse(fetchMock.mock.calls.at(-1)![1]!.body as string)).toMatchObject({ applyToBoth: true })
    expect(screen.getByText(/заменяет отдельные настройки Inner Health и Sprint Power/)).toBeVisible()
  })

  it('uses saved scoped config for checks and sync, and blocks both when dirty', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, results: [{ brand: 'inner', skipped: false, points: 25 }] })))
    vi.stubGlobal('fetch', fetchMock)
    render(<OzonSettingsPanel scope="inner" />)
    await screen.findByLabelText('Client ID')
    fireEvent.click(screen.getByRole('button', { name: 'Проверить API Ozon' }))
    await screen.findByText('Подключение к Ozon проверено.')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/ozon-delivery/check?brand=inner', expect.objectContaining({ method: 'POST' }))
    fireEvent.click(screen.getByRole('button', { name: 'Обновить ПВЗ Ozon' }))
    expect(await screen.findByText('Обновление ПВЗ: Inner Health — 25 пунктов.')).toBeVisible()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/ozon-delivery/points-sync?brand=inner', expect.objectContaining({ method: 'POST' }))
    fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'changed-client' } })
    expect(screen.getByRole('button', { name: 'Проверить API Ozon' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Обновить ПВЗ Ozon' })).toBeDisabled()
    expect(screen.getByText(/Сначала сохраните изменения/)).toBeVisible()
  })

  it('discards stale loads and never exposes credentials from the previous scope', async () => {
    let finishOld!: (value: Response) => void
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>(resolve => { finishOld = resolve }))
      .mockResolvedValueOnce(response({ ...defaultSettings, ozon_client_id: 'sprint-example' }))
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(<OzonSettingsPanel scope="inner" />)
    rerender(<OzonSettingsPanel scope="sprint-power" />)
    expect(await screen.findByLabelText('Client ID')).toHaveValue('sprint-example')
    await act(async () => { finishOld(response({ ...defaultSettings, ozon_client_id: 'inner-example' })) })
    expect(screen.getByLabelText('Client ID')).toHaveValue('sprint-example')
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('shows a failed new scope without the previous settings, then allows retry', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Нет доступа к настройкам' }), { status: 403 }))
      .mockResolvedValueOnce(response({ ...defaultSettings, ozon_client_id: 'retry-example' })))
    const { rerender } = render(<OzonSettingsPanel scope="global" />)
    await screen.findByLabelText('Client ID')
    fireEvent.change(screen.getByLabelText('Client Secret'), { target: { value: 'unsaved-example' } })
    rerender(<OzonSettingsPanel scope="inner" />)
    expect(screen.queryByLabelText('Client ID')).not.toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Нет доступа к настройкам')
    expect(screen.queryByLabelText('Client Secret')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку Ozon' }))
    expect(await screen.findByLabelText('Client ID')).toHaveValue('retry-example')
    expect(screen.getByLabelText('Client Secret')).toHaveValue('')
  })

  it('ignores a save response after switching scope and disables controls during the save', async () => {
    let finishSave!: (value: Response) => void
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response())
      .mockImplementationOnce(() => new Promise<Response>(resolve => { finishSave = resolve }))
      .mockResolvedValueOnce(response({ ...defaultSettings, ozon_client_id: 'sprint-example' }))
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(<OzonSettingsPanel scope="inner" />)
    await screen.findByLabelText('Client ID')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить Ozon' }))
    expect(screen.getByRole('button', { name: 'Сохранить Ozon' })).toBeDisabled()
    expect(screen.getByLabelText('Client ID')).toBeDisabled()
    rerender(<OzonSettingsPanel scope="sprint-power" />)
    await screen.findByLabelText('Client ID')
    await act(async () => { finishSave(response({ ...defaultSettings, ozon_client_id: 'inner-example' })) })
    expect(screen.getByLabelText('Client ID')).toHaveValue('sprint-example')
    expect(screen.queryByText('Настройки Ozon сохранены.')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls[1][1].signal.aborted).toBe(true)
  })

  it('preserves unsaved edits and reports an API validation error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response())
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Заполните Client ID' }), { status: 400 })))
    render(<OzonSettingsPanel scope="inner" />)
    await screen.findByLabelText('Client ID')
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить Ozon' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Заполните Client ID')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить Ozon' })).toBeEnabled())
    expect(screen.getByRole('switch')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Проверить API Ozon' })).toBeDisabled()
  })

  it('does not display a secret even if it is accidentally included in a server response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ...defaultSettings, ozon_client_secret: 'never-show-this' })))
    render(<OzonSettingsPanel scope="global" />)
    expect(await screen.findByLabelText('Client Secret')).toHaveValue('')
    expect(screen.queryByDisplayValue('never-show-this')).not.toBeInTheDocument()
  })
})
