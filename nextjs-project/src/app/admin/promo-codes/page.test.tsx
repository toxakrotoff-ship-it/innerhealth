import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import PromoCodesPage from './page'

const codes = ['FIRST', 'SECOND'].map((code, index) => ({
  id: String(index), code, discountType: 'percentage', discountValue: 10,
  isActive: true, usageLimit: 100, usedCount: 2,
  validFrom: '2026-10-01T00:00:00.000Z',
  validTo: '2026-10-31T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
}))

const scrollIntoView = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => codes }))
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true, value: scrollIntoView,
  })
  scrollIntoView.mockClear()
  // The shared setup replaces CSSStyleDeclaration with an object without methods.
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => ({
    display: (element as HTMLElement).style.display || 'block',
    visibility: 'visible',
    getPropertyValue: (name: string) => (element as HTMLElement).style.getPropertyValue(name),
  }) as CSSStyleDeclaration)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

async function loadPage() {
  render(<PromoCodesPage />)
  await screen.findByRole('heading', { name: 'Промокоды' })
}

function editor(location = 'desktop') {
  return document.getElementById(`promo-code-editor-${location}`)!
}

describe('Promo code inline editing', () => {
  it.each([
    ['mobile', 0], ['desktop', 2],
  ])('opens below the selected %s item, preserves drafts on repeat clicks, and moves on selection', async (location, index) => {
    await loadPage()
    const editButtons = screen.getAllByRole('button', { name: 'Редактировать' })
    fireEvent.click(editButtons[index])
    const selectedItem = location === 'desktop'
      ? editButtons[index].closest('tr')!.nextElementSibling!
      : editButtons[index].closest('.card')!
    expect(selectedItem).toContainElement(editor(location))
    if (location === 'desktop') expect(editor().closest('td')).toHaveAttribute('colspan', '7')
    expect(document.getElementById('promo-code-editor-create')).toBeNull()
    expect(within(editor(location)).getByLabelText('Код')).toHaveValue('FIRST')
    expect(editButtons[index]).toHaveAttribute('aria-expanded', 'true')

    fireEvent.change(within(editor(location)).getByLabelText('Код'), { target: { value: 'DRAFT' } })
    fireEvent.click(editButtons[index])
    expect(within(editor(location)).getByLabelText('Код')).toHaveValue('DRAFT')

    fireEvent.click(editButtons[index + 1])
    expect(within(editor(location)).getByLabelText('Код')).toHaveValue('SECOND')
    expect(editButtons[index]).toHaveAttribute('aria-expanded', 'false')
    expect(selectedItem).not.toContainElement(editor(location))
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('shows saved ISO dates and submits an extended expiry without losing the start date', async () => {
    await loadPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Редактировать' })[2])
    expect(within(editor()).getByLabelText('Дата начала действия')).toHaveValue('2026-10-01')
    expect(within(editor()).getByLabelText('Дата окончания действия')).toHaveValue('2026-10-31')
    fireEvent.change(within(editor()).getByLabelText('Дата окончания действия'), { target: { value: '2026-11-30' } })
    fireEvent.click(within(editor()).getByRole('button', { name: 'Обновить' }))
    await waitFor(() => expect(screen.queryAllByRole('region')).toHaveLength(0))
    expect(fetch).toHaveBeenCalledWith('/api/admin/promo-codes', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({
        id: '0', code: 'FIRST', discountType: 'percentage', discountValue: 10,
        usageLimit: 100, validFrom: '2026-10-01', validTo: '2026-11-30',
      }),
    }))
    expect(screen.getAllByText('FIRST')).toHaveLength(2)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('keeps the selected row mounted while refreshing after a save', async () => {
    await loadPage()
    const row = screen.getAllByRole('button', { name: 'Редактировать' })[2].closest('tr')!
    fireEvent.click(within(row).getByRole('button', { name: 'Редактировать' }))
    let finishRefresh!: (response: Response) => void
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true } as Response)
      .mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = resolve }))
    fireEvent.click(within(editor()).getByRole('button', { name: 'Обновить' }))
    await waitFor(() => expect(finishRefresh).toBeTypeOf('function'))
    expect(row).toBeInTheDocument()
    finishRefresh({ ok: true, json: async () => codes } as Response)
    await waitFor(() => expect(editor()).toBeNull())
  })

  it('keeps creation above the list and closes the inline editor on cancel', async () => {
    await loadPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Редактировать' })[2])
    fireEvent.click(within(editor()).getByRole('button', { name: 'Отмена' }))
    expect(editor()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Создать промокод' }))
    const createEditor = editor('create')
    expect(createEditor.closest('tr')).toBeNull()
    expect(within(createEditor).getByLabelText('Код')).toHaveValue('')
    expect(within(createEditor).getByLabelText('Дата окончания действия')).toHaveValue('')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
