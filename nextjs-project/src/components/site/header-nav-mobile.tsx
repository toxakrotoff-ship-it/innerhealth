'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import type { BrandContactConfig, BrandNavLink } from '@/lib/brand/site-branding'

interface HeaderNavMobileProps {
  variant?: 'light' | 'dark'
  isAuthenticated?: boolean
  role?: string
  logoText: string
  /** When set, drawer header shows raster logo (e.g. Sprint) instead of text. */
  logoImageSrc?: string
  navLinks: readonly BrandNavLink[]
  contact: BrandContactConfig
}

export function HeaderNavMobile({
  variant = 'light',
  isAuthenticated = false,
  role,
  logoText,
  logoImageSrc,
  navLinks,
  contact,
}: HeaderNavMobileProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const bodyOverflowBeforeLockRef = useRef<string | null>(null)
  const pathname = usePathname()
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) {
      if (bodyOverflowBeforeLockRef.current !== null) {
        document.body.style.overflow = bodyOverflowBeforeLockRef.current
        bodyOverflowBeforeLockRef.current = null
      }
      return
    }

    if (bodyOverflowBeforeLockRef.current === null) {
      bodyOverflowBeforeLockRef.current = document.body.style.overflow
    }
    document.body.style.overflow = 'hidden'

    return () => {
      if (bodyOverflowBeforeLockRef.current !== null) {
        document.body.style.overflow = bodyOverflowBeforeLockRef.current
        bodyOverflowBeforeLockRef.current = null
      }
    }
  }, [open])

  const buttonClass =
    variant === 'dark'
      ? 'p-1.5 sm:p-2 rounded-md text-gray-300 hover:bg-white/10 hover:text-white min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center transition-colors shrink-0'
      : 'p-2 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors shrink-0'

  const navBg = variant === 'dark' ? 'bg-gray-900' : 'bg-white'
  const navBorder = variant === 'dark' ? 'border-gray-700' : 'border-slate-100'
  const navLinkClass = variant === 'dark'
    ? 'px-5 py-3 text-base text-gray-300 hover:bg-white/10 hover:text-white border-b border-gray-700 last:border-0 transition-colors'
    : 'px-5 py-3 text-base text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-100 last:border-0 transition-colors'
  const iconButtonClass = variant === 'dark'
    ? 'p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'
    : 'p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center'

  const menuContent =
    open && mounted ? (
      <>
        <div
          className="fixed inset-0 z-100 bg-black/30"
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <nav
          className={`fixed left-0 top-0 bottom-0 z-101 w-[min(280px,85vw)] max-w-full ${navBg} shadow-xl overflow-y-auto pt-[env(safe-area-inset-top)]`}
          aria-label="Меню"
        >
          <div className="flex flex-col pt-4 pb-4">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className={`flex items-center px-5 pb-4 border-b ${navBorder} ${logoImageSrc ? '' : `font-semibold uppercase tracking-tighter ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}`}
              aria-label={`${logoText} — на главную`}
            >
              {logoImageSrc ? (
                <Image
                  src={logoImageSrc}
                  alt={logoText}
                  width={1680}
                  height={845}
                  className="h-10 w-auto max-w-[220px] object-contain object-left"
                  sizes="220px"
                />
              ) : (
                logoText
              )}
            </Link>
            <div className="flex flex-col">
              {navLinks.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className={navLinkClass}
                    onClick={() => setOpen(false)}
                  >
                  {label}
                </Link>
              ))}
            </div>
            <div className={`px-5 py-3 border-t ${navBorder} flex flex-col gap-2`}>
              {isAuthenticated ? (
                <>
                  <Link
                    href={role === 'ADMIN' || role === 'WRITER' ? '/admin' : '/account'}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${variant === 'dark' ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
                    onClick={() => setOpen(false)}
                  >
                    <ProfileGlyph />
                    {role === 'ADMIN' || role === 'WRITER' ? 'Управление сайтом' : 'Личный кабинет'}
                  </Link>
                  <button
                    type="button"
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${variant === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                    onClick={() => {
                      setOpen(false)
                      signOut({ callbackUrl: '/' })
                    }}
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${variant === 'dark' ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  onClick={() => setOpen(false)}
                >
                  Войти
                </Link>
              )}
            </div>
            <div className={`mt-auto pt-4 pb-2 px-5 border-t ${navBorder}`}>
                <a
                  href={`tel:${contact.phone.replace(/\s|\(|\)|-/g, '')}`}
                className={`flex items-center gap-2 mb-3 text-sm font-medium ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}
                onClick={() => setOpen(false)}
              >
                <PhoneIcon />
                  {contact.phone}
              </a>
              <div className="flex items-center gap-0.5 2xl:gap-1 3xl:gap-2">
                <a
                    href={`tel:${contact.phone.replace(/\s|\(|\)|-/g, '')}`}
                  className={iconButtonClass}
                  aria-label="Позвонить"
                  onClick={() => setOpen(false)}
                >
                  <PhoneIcon />
                </a>
                <a
                    href={`mailto:${contact.email}`}
                  className={iconButtonClass}
                  aria-label="Написать на почту"
                  onClick={() => setOpen(false)}
                >
                  <MailIcon />
                </a>
              </div>
            </div>
          </div>
        </nav>
      </>
    ) : null

  return (
    <div className="xl:hidden relative">
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

function PhoneIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function ProfileGlyph() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
