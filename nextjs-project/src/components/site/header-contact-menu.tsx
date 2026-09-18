'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { BrandContactConfig } from '@/lib/brand/site-branding'

interface HeaderContactMenuProps {
  variant?: 'light' | 'dark'
  contact: BrandContactConfig
  isAuthenticated: boolean
}

const triggerButtonClass = {
  light: 'rounded-full transition-colors min-h-[44px] min-w-[44px] 2xl:min-h-[52px] 2xl:min-w-[52px] 3xl:min-h-[58px] 3xl:min-w-[58px] flex items-center justify-center shrink-0 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  dark: 'rounded-full transition-colors min-h-[44px] min-w-[44px] 2xl:min-h-[52px] 2xl:min-w-[52px] 3xl:min-h-[58px] 3xl:min-w-[58px] flex items-center justify-center shrink-0 p-2 text-slate-300 hover:text-white hover:bg-slate-800',
} as const

/**
 * Объединяет телефон/почту и (для неавторизованных) ссылку "Войти" в один
 * дропдаун, чтобы освободить место в шапке на ноутбучных разрешениях
 * (~1280–1900px), где раздельные иконки+ссылка накладывались на навигацию.
 */
export function HeaderContactMenu({ variant = 'light', contact, isAuthenticated }: HeaderContactMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={triggerButtonClass[variant]}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Контакты"
        title="Контакты"
      >
        <ContactGlyph />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl"
          role="menu"
        >
          <a
            href={`tel:${contact.phone.replace(/\s|\(|\)|-/g, '')}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-100"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <PhoneIcon />
            {contact.phone}
          </a>
          <a
            href={`mailto:${contact.email}`}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-100"
            role="menuitem"
            onClick={() => setIsOpen(false)}
          >
            <MailIcon />
            {contact.email}
          </a>
          <div className="px-3 py-1.5 text-xs text-gray-400">Ежедневно 9:00 — 21:00</div>
          {!isAuthenticated ? (
            <Link
              href="/login"
              className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              Войти
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ContactGlyph() {
  return (
    <svg className="h-6 w-6 2xl:h-7 2xl:w-7 3xl:h-8 3xl:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" strokeWidth="2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4M12 16h.01" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
