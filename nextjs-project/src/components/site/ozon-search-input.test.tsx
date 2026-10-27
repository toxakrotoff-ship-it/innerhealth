import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OzonSearchInput } from './ozon-search-input'

describe('Ozon autocomplete navigation', () => {
  it('scrolls keyboard selection into view and selects with Enter', () => {
    const select = vi.fn()
    render(<OzonSearchInput id="ozon-city" value="Са" placeholder="Город" isSprintTheme={false}
      suggestions={Array.from({ length: 12 }, (_, index) => ({ id: String(index), label: `Город ${index}` }))}
      onChange={vi.fn()} onSelect={select} onSearch={vi.fn()} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    const options = screen.getAllByRole('option')
    const scroll = vi.fn()
    options[8].scrollIntoView = scroll
    for (let index = 0; index < 8; index++) fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(options[8]).toHaveAttribute('aria-selected', 'true')
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(select).toHaveBeenCalledWith('8')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('selects with the mouse while keeping input focus', () => {
    const select = vi.fn()
    render(<OzonSearchInput id="ozon-city" value="Са" placeholder="Город" isSprintTheme={true}
      suggestions={[{ id: 'samara', label: 'Самара' }]} onChange={vi.fn()} onSelect={select} onSearch={vi.fn()} />)
    fireEvent.focus(screen.getByRole('combobox'))
    const option = screen.getByRole('option')
    expect(fireEvent.mouseDown(option)).toBe(false)
    fireEvent.click(option)
    expect(select).toHaveBeenCalledWith('samara')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
