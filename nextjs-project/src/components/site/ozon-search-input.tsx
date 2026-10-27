'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Suggestion { id: string; label: string }

export function OzonSearchInput({ id, value, placeholder, suggestions, isSprintTheme, onChange, onSelect, onSearch }: {
  id: string
  value: string
  placeholder: string
  suggestions: Suggestion[]
  isSprintTheme: boolean
  onChange: (value: string) => void
  onSelect: (id: string) => void
  onSearch: () => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const expanded = open && suggestions.length > 0
  const activeIndex = Math.min(active, suggestions.length - 1)
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (expanded) listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [expanded, activeIndex])
  const select = (option: Suggestion) => { setOpen(false); onSelect(option.id) }

  return <div className="relative min-w-0 flex-1">
    <input id={id} value={value} maxLength={100} placeholder={placeholder} autoComplete="off"
      role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-suggestions`}
      aria-activedescendant={expanded ? `${id}-option-${activeIndex}` : undefined}
      onFocus={() => { setOpen(true); setActive(0) }} onBlur={() => setOpen(false)}
      onChange={event => { setOpen(true); setActive(0); onChange(event.target.value) }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
          event.preventDefault()
          setOpen(true)
          setActive(open ? (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length : 0)
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          if (expanded) select(suggestions[activeIndex])
          else { setOpen(true); onSearch() }
        }
      }}
      className={cn('form-input min-h-[44px] w-full rounded-lg text-base', isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100')} />
    {expanded ? <ul ref={listRef} id={`${id}-suggestions`} role="listbox" aria-label={id === 'ozon-city' ? 'Подсказки городов Ozon' : 'Подсказки адресов Ozon'}
      className={cn('absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border shadow-lg',
        isSprintTheme ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white')}>
      {suggestions.map((option, index) => <li key={option.id} id={`${id}-option-${index}`} role="option"
        aria-selected={index === activeIndex} onMouseDown={event => event.preventDefault()}
        onClick={() => select(option)}
        className={cn('min-h-[44px] cursor-pointer break-words px-3 py-3 text-sm',
          index === activeIndex && (isSprintTheme ? 'bg-slate-700' : 'bg-action-blue/10'))}>
        {option.label}
      </li>)}
    </ul> : null}
  </div>
}
