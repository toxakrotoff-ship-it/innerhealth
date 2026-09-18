'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BrandNavLink } from '@/lib/brand/site-branding'

interface HeaderNavDropdownProps {
  label: string
  items: readonly BrandNavLink[]
  variant?: 'light' | 'dark'
}

/**
 * Пункт десктоп-навигации, раскрывающий список ссылок по клику — группирует
 * второстепенные разделы (например «Сотрудничество»), чтобы не плодить пункты
 * в основном ряду и не наезжать на телефон/корзину/логотип справа.
 * Панель рендерится через портал в document.body с позиционированием по
 * getBoundingClientRect триггера — родительский ряд шапки имеет overflow-hidden
 * (для адаптивного масштабирования), поэтому обычный absolute-дочерний элемент обрезается.
 */
export function HeaderNavDropdown({ label, items, variant = 'light' }: HeaderNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isOpen) return
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({ top: rect.bottom + 8, left: rect.left })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const panel =
    isOpen && mounted ? (
      <div
        ref={panelRef}
        style={{ position: 'fixed', top: position.top, left: position.left }}
        className={`z-100 w-56 rounded-2xl border p-2 normal-case tracking-normal shadow-xl ${
          variant === 'dark' ? 'border-slate-700 bg-[#0F172A]' : 'border-gray-200 bg-white'
        }`}
        role="menu"
      >
        {items.map((item) => (
          <a
            key={item.href + item.label}
            href={item.href}
            className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              variant === 'dark' ? 'text-slate-200 hover:bg-white/10' : 'text-gray-800 hover:bg-gray-100'
            }`}
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </a>
        ))}
      </div>
    ) : null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1 transition-colors whitespace-nowrap ${variant === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {label}
        <svg
          className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {mounted && createPortal(panel, document.body)}
    </div>
  )
}
