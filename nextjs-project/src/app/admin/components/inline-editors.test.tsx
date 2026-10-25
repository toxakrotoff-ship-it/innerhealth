import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import FaqPage from '../faq/page'
import CategoriesPage from '../catalog/categories/page'
import RedirectsPage from '../redirects/page'
import GiftPromotionsPage from '../gift-promotions/page'
import { AdminBrandProvider } from '../context/admin-brand'
import { getFaqItems } from '../faq/actions'
import { getCategories } from '../catalog/actions'

vi.mock('../faq/actions', () => ({
  getFaqItems: vi.fn(), createFaqItem: vi.fn(), updateFaqItem: vi.fn(), deleteFaqItem: vi.fn(),
}))
vi.mock('../catalog/actions', () => ({
  getCategories: vi.fn(), createCategory: vi.fn(), updateCategory: vi.fn(),
  deleteCategory: vi.fn(), updateCategoriesSortOrder: vi.fn(),
}))
vi.mock('../news/components/CoverImageDropzone', () => ({ CoverImageDropzone: () => null }))
vi.mock('../catalog/components/sprint-category-line-editor', () => ({ SprintCategoryLineEditor: () => null }))
vi.mock('../products/components/ProductRichTextEditor', () => ({ ProductRichTextEditor: () => null }))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  })
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => ({
    display: (element as HTMLElement).style.display || 'block', visibility: 'visible',
    getPropertyValue: (name: string) => (element as HTMLElement).style.getPropertyValue(name),
  }) as CSSStyleDeclaration)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function region(id: string) { return document.getElementById(id)! }

describe('Analogous admin inline editors', () => {
  it('keeps FAQ editing inside the selected list item and switches to a clean create form', async () => {
    vi.mocked(getFaqItems).mockResolvedValue([
      { id: 'faq-1', question: 'Question 1', answer: 'Answer 1', sortOrder: 0, isPublished: true },
      { id: 'faq-2', question: 'Question 2', answer: 'Answer 2', sortOrder: 1, isPublished: true },
    ])
    render(<FaqPage />)
    const buttons = await screen.findAllByRole('button', { name: 'Редактировать' })
    fireEvent.click(buttons[0])
    expect(buttons[0].closest('li')).toContainElement(region('faq-editor-item'))
    fireEvent.click(buttons[1])
    expect(buttons[1].closest('li')).toContainElement(region('faq-editor-item'))
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(within(region('faq-editor-item')).getByDisplayValue('Question 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить вопрос' }))
    expect(region('faq-editor-item')).toBeNull()
    expect(within(region('faq-editor-create')).getAllByRole('textbox')[0]).toHaveValue('')
  })

  it('keeps the category editor inside its item and resets all fields when creating', async () => {
    vi.mocked(getCategories).mockResolvedValue([{
      id: 'cat-1', title: 'Selected category', slug: 'selected', parentId: null,
      sortOrder: 0, isPublished: true, showInCategoriesBlock: true,
    }] as Awaited<ReturnType<typeof getCategories>>)
    render(<AdminBrandProvider value="inner"><CategoriesPage /></AdminBrandProvider>)
    const edit = await screen.findByRole('button', { name: 'Ред.' })
    fireEvent.click(edit)
    expect(edit.closest('li')).toContainElement(region('category-editor-item'))
    const title = within(region('category-editor-item')).getByDisplayValue('Selected category')
    fireEvent.change(title, { target: { value: 'Category draft' } })
    fireEvent.click(edit)
    expect(title).toHaveValue('Category draft')
    fireEvent.click(screen.getByRole('button', { name: 'Добавить категорию' }))
    expect(region('category-editor-item')).toBeNull()
    const create = within(region('category-editor-create'))
    expect(create.getAllByRole('textbox')[0]).toHaveValue('')
    expect(create.queryByDisplayValue('selected')).toBeNull()
    expect(create.queryByDisplayValue('Category draft')).toBeNull()
  })

  it.each([['mobile', 0], ['desktop', 2]])('places a redirect editor below the selected %s item', async (location, index) => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [0, 1].map((id) => ({
      id: String(id), sourcePath: `/old-${id}`, destination: `/new-${id}`, statusCode: 301,
      entityType: null, entityId: null, note: null, createdAt: '', updatedAt: '',
    })) } as Response)
    render(<RedirectsPage />)
    const buttons = await screen.findAllByRole('button', { name: 'Изменить' })
    fireEvent.click(buttons[index])
    const selectedItem = location === 'desktop' ? buttons[index].closest('tr')!.nextElementSibling : buttons[index].closest('.rounded-xl')
    expect(selectedItem).toContainElement(region(`redirect-editor-${location}`))
    expect(within(region(`redirect-editor-${location}`)).getByDisplayValue('/old-0')).toBeInTheDocument()
    fireEvent.click(within(region(`redirect-editor-${location}`)).getByRole('button', { name: 'Отмена' }))
    expect(region(`redirect-editor-${location}`)).toBeNull()
  })

  it.each([['mobile', 0], ['desktop', 2]])('places a gift promotion editor below the selected %s item', async (location, index) => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [0, 1].map((id) => ({
      id: String(id), title: `Gift ${id}`, status: 'enabled', giftProductId: 'gift-product',
      validFrom: null, validTo: null, triggerType: 'CART_TOTAL', minCartTotal: 1000,
      giftQuantityMode: 'ONE_PER_ORDER', priority: 0, showOnSite: true,
    })) } as Response)
    render(<GiftPromotionsPage />)
    const buttons = await screen.findAllByRole('button', { name: 'Редактировать' })
    fireEvent.click(buttons[index])
    const selectedItem = location === 'desktop' ? buttons[index].closest('tr')!.nextElementSibling : buttons[index].closest('.card')
    expect(selectedItem).toContainElement(region(`gift-promotion-editor-${location}`))
    expect(within(region(`gift-promotion-editor-${location}`)).getByDisplayValue('Gift 0')).toBeInTheDocument()
    expect(region('gift-promotion-editor-create')).toBeNull()
  })
})
