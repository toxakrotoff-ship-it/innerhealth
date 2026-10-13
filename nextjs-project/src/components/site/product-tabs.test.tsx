/** @vitest-environment jsdom */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductTabs, type ProductTabItem } from './product-tabs'
import { ProductDocumentsSection } from './product-documents-section'

const tabs: ProductTabItem[] = [
  { title: 'О продукте', content: 'Описание продукта' },
  { title: 'Состав', content: 'Состав продукта' },
  {
    title: 'Документы',
    content: '',
    anchorId: 'product-documents',
    node: <ProductDocumentsSection productTitle="Куриный бульон" documents={[{
      id: 'doc-1', title: 'Декларация на бульон', typeLabel: 'Декларация соответствия',
      fileUrl: '/uploads/documents/broth.pdf', fileName: 'broth.pdf',
      mimeType: 'application/pdf', fileSize: 1024, documentNumber: 'TEST-123',
    }]} />,
  },
]

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  Element.prototype.scrollIntoView = vi.fn()
  // The shared setup spreads CSSStyleDeclaration into a plain object. Restore
  // a native implementation for real accessible-name/visibility checks here.
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const nativeStyle = iframe.contentWindow!.getComputedStyle.bind(iframe.contentWindow)
  vi.spyOn(window, 'getComputedStyle').mockImplementation(nativeStyle)
  iframe.remove()
})

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('ProductTabs document discovery', () => {
  it('includes document text and PDF links in the server HTML before interaction', () => {
    const html = renderToString(<ProductTabs tabs={tabs} />)
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    expect(parsed.querySelectorAll('a[href="/uploads/documents/broth.pdf"]')).toHaveLength(1)
    const documents = parsed.getElementById('product-documents')!
    expect(documents.textContent).toContain('TEST-123')
    expect(documents.textContent).toContain('Куриный бульон')
    expect(documents.hasAttribute('hidden')).toBe(true)
  })

  it('preserves tab/panel accessibility relationships and switches visible content', async () => {
    const user = userEvent.setup()
    render(<ProductTabs tabs={tabs} />)
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.id).toBeTruthy()
      const panel = document.getElementById(tab.getAttribute('aria-controls')!)!
      expect(panel).not.toBeNull()
      expect(panel.getAttribute('aria-labelledby')).toBe(tab.id)
    }
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    await user.click(screen.getByRole('tab', { name: 'Документы' }))
    expect(screen.getByRole('tabpanel', { name: 'Документы' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Открыть PDF: Декларация на бульон' })).toHaveAttribute('href', '/uploads/documents/broth.pdf')
    expect(screen.getByText('Описание продукта')).not.toBeVisible()
  })

  it('opens a direct document anchor and allows returning via the same link after switching tabs', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/product/broth#product-documents')
    render(<ProductTabs tabs={tabs} />)
    await waitFor(() => expect(screen.getByRole('tabpanel', { name: 'Документы' })).toHaveFocus())
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    await user.click(screen.getByRole('tab', { name: 'Состав', exact: true }))
    expect(window.location.hash).toBe('')
    await act(async () => {
      window.location.hash = 'product-documents'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await waitFor(() => expect(screen.getByRole('tabpanel', { name: 'Документы' })).toHaveFocus())
  })

  it('keeps legacy document links in the initial HTML too', () => {
    const html = renderToString(<ProductTabs tabs={[
      tabs[0],
      { title: 'Документы', anchorId: 'product-documents', content: '<a href="/legacy.pdf">Декларация</a>' },
    ]} />)
    expect(html).toContain('href="/legacy.pdf"')
  })
})
