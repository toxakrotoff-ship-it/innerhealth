'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const NAV_LINKS = [
  { label: 'О нас', href: '/o-nas' },
  { label: 'Новости', href: '/news' },
  { label: 'Статьи', href: '/informaciya' },
  { label: 'Каталог', href: '/catalog' },
  { label: 'АКЦИИ', href: '/catalog/aktsii' },
  { label: 'Сотрудничество', href: '/sotrudnichestvo' },
  { label: 'Контакты', href: '/contacts' },
] as const

interface HeaderNavMobileProps {
  variant?: 'light' | 'dark'
}

export function HeaderNavMobile({ variant = 'light' }: HeaderNavMobileProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const buttonClass =
    variant === 'dark'
      ? 'p-1.5 sm:p-2 rounded-md text-gray-300 hover:bg-white/10 hover:text-white min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center transition-colors shrink-0'
      : 'p-2 rounded-md text-gray-700 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors'

  const menuContent =
    open && mounted ? (
      <>
        <div
          className="fixed inset-0 z-[100] bg-black/30"
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <nav
          className="fixed left-0 top-0 bottom-0 z-[101] w-[min(280px,85vw)] max-w-full bg-gray-900 shadow-xl overflow-y-auto"
          aria-label="Меню"
        >
          <div className="flex flex-col pt-4 pb-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center px-5 pb-4 border-b border-gray-700"
              aria-label="Inner Health — на главную"
            >
              <img
                src="/logo.png"
                alt="Inner Health"
                className="h-8 w-auto object-contain"
                width={120}
                height={40}
              />
            </Link>
            <div className="flex flex-col">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-5 py-3 text-base text-gray-300 hover:bg-white/10 hover:text-white border-b border-gray-700 last:border-0 transition-colors"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            </div>
          </div>
        </nav>
      </>
    ) : null

  return (
    <div className="lg:hidden relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
        aria-expanded={open}
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      {mounted && createPortal(menuContent, document.body)}
    </div>
  )
}
