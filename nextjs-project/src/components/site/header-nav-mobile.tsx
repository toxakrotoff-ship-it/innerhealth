'use client'

import Link from 'next/link'
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
  navLinks: readonly BrandNavLink[]
  contact: BrandContactConfig
}

export function HeaderNavMobile({
  variant = 'light',
  isAuthenticated = false,
  role,
  logoText,
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
              className={`flex items-center px-5 pb-4 border-b ${navBorder} font-semibold uppercase tracking-tighter ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}
              aria-label={`${logoText} — на главную`}
            >
              {logoText}
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
                    href={role === 'ADMIN' || role === 'WRITER' ? '/admin-panel' : '/account'}
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
                <a
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={iconButtonClass}
                  aria-label="WhatsApp"
                  onClick={() => setOpen(false)}
                >
                  <WhatsAppIcon />
                </a>
                <a
                  href={contact.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={iconButtonClass}
                  aria-label="Telegram"
                  onClick={() => setOpen(false)}
                >
                  <TelegramIcon />
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

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.865 9.865 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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

function TelegramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
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
