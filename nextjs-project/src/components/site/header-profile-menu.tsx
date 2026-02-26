'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

interface HeaderProfileMenuProps {
  isAuthenticated: boolean
  role?: string
}

export function HeaderProfileMenu({ isAuthenticated, role }: HeaderProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isAdminUser = role === 'ADMIN' || role === 'WRITER'

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

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap min-h-[40px] sm:min-h-[44px] flex items-center shrink-0"
        aria-label="Войти"
        title="Войти"
      >
        Войти
      </Link>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-gray-300 hover:text-white transition-colors min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shrink-0"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={isAdminUser ? 'Управление сайтом' : 'Личный кабинет'}
        title={isAdminUser ? 'Управление сайтом' : 'Личный кабинет'}
      >
        <ProfileGlyph />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl"
          role="menu"
        >
          {isAdminUser ? (
            <>
              <Link
                href="/admin/profile"
                className="block rounded-xl px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                Редактировать профиль
              </Link>
              <Link
                href="/admin/catalog"
                className="mt-1 block rounded-xl px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                Управление сайтом
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/account"
                className="block rounded-xl px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                Редактировать профиль
              </Link>
              <Link
                href="/account/orders"
                className="mt-1 block rounded-xl px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                История заказов
              </Link>
              <Link
                href="/wishlist"
                className="mt-1 block rounded-xl px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                Избранное
              </Link>
            </>
          )}

          <button
            type="button"
            className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Выйти
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ProfileGlyph() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8" strokeWidth="2" />
      <circle cx="12" cy="9.5" r="2.5" strokeWidth="2" />
      <path
        d="M8.8 16.5c.7-1.6 1.9-2.5 3.2-2.5s2.5.9 3.2 2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}
