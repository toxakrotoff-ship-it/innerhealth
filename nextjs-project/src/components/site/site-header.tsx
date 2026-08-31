import Link from 'next/link'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { HeaderCartButton } from './header-cart-button'
import { HeaderNavMobile } from './header-nav-mobile'
import { HeaderProfileMenu } from './header-profile-menu'
import { AdaptiveNav } from './adaptive-nav'
import { ClearInvalidSession } from './clear-invalid-session'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import type { BrandId } from '@/lib/brand/brand'

/**
 * Заголовок сайта с адаптивной поддержкой экранов до 5K+ (5120px).
 * 
 * Использует систему токенов для адаптивного масштабирования:
 * - Контейнер с адаптивной шириной
 * - Адаптивные отступы и промежутки
 * - Масштабирование типографики
 */
export async function SiteHeader({ brandId }: { brandId: BrandId }) {
  const siteConfig = getBrandSiteConfig(brandId)
  const isSprintTheme = brandId === 'sprint-power'
  const { contact } = siteConfig
  let session = null
  let hasInvalidSession = false

  // Чтобы не тратить CPU на `getServerSession` при каждом заходе (особенно для анонимных),
  // сначала проверим наличие cookies NextAuth.
  let hasSessionCookie = false
  try {
    const cookieStore = await cookies()
    hasSessionCookie =
      Boolean(cookieStore.get('next-auth.session-token')) ||
      Boolean(cookieStore.get('__Secure-next-auth.session-token'))
  } catch {
    // Ignore cookie read errors
  }

  if (hasSessionCookie) {
    try {
      session = await getServerSession(authOptions)
    } catch (error) {
      // Ошибка декодирования JWT — токен зашифрован другим ключом
      if (process.env.NODE_ENV === 'development') {
        console.error(
          '[SiteHeader] Failed to decode session token:',
          error instanceof Error ? error.message : String(error),
        )
      }
      hasInvalidSession = true
    }
  }
  
  // Если сессия null, проверяем наличие cookies NextAuth
  // Если cookies есть - они повреждены и должны быть очищены через API
  if (!session && hasSessionCookie) hasInvalidSession = true
  
  const isAuthenticated = Boolean(session?.user?.id)

  return (
    <>
    {/* Клиентский компонент для очистки поврежденных cookies */}
    <ClearInvalidSession hasInvalidSession={hasInvalidSession} />
    <header
      className={`site-header fixed top-[var(--vpn-notice-offset,0px)] left-0 right-0 z-50 w-full backdrop-blur-md pt-[env(safe-area-inset-top)] ${
        isSprintTheme
          ? 'border-b border-slate-800 bg-[#060A14]/85 shadow-[0_10px_30px_-28px_rgba(2,6,23,0.85)] supports-backdrop-filter:bg-[#060A14]/80'
          : 'border-b border-slate-100 bg-white/80 shadow-[0_10px_30px_-28px_rgba(2,6,23,0.45)] supports-backdrop-filter:bg-white/80'
      }`}
    >
      <div 
        className={`
          w-full mx-auto px-4 sm:px-6 lg:px-8
          xl:px-10 2xl:px-12 3xl:px-16 4xl:px-20 5xl:px-24 6xl:px-32
          h-16 2xl:h-18 3xl:h-20 4xl:h-24 5xl:h-28 6xl:h-32
          flex items-center justify-between gap-4 lg:gap-6 2xl:gap-8
        `}
      >
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-8 2xl:gap-12 3xl:gap-16 4xl:gap-20 5xl:gap-24 6xl:gap-28">
          <HeaderNavMobile
            variant={isSprintTheme ? 'dark' : 'light'}
            isAuthenticated={isAuthenticated}
            role={session?.user?.role}
            logoText={siteConfig.logoText}
            logoImageSrc={isSprintTheme ? '/images/sprint-power/sprint-power-hero-logo.png' : undefined}
            navLinks={siteConfig.mobileNavLinks}
            contact={siteConfig.contact}
          />
          {isSprintTheme ? (
            <Link
              href="/"
              className="relative block shrink-0 hover:opacity-90 transition-opacity"
              aria-label={`${siteConfig.title} — на главную`}
            >
              <Image
                src="/images/sprint-power/sprint-power-hero-logo.png"
                alt={siteConfig.logoText}
                width={1680}
                height={845}
                priority
                className="h-9 w-auto max-h-9 max-w-[min(13rem,42vw)] object-contain object-left sm:h-10 sm:max-h-10 sm:max-w-[min(15rem,38vw)] 2xl:h-12 2xl:max-h-12 2xl:max-w-[min(17rem,32vw)] 3xl:h-14 3xl:max-h-14 3xl:max-w-[min(20rem,28vw)]"
                sizes="(max-width: 640px) 42vw, (max-width: 1536px) 15rem, 20rem"
              />
            </Link>
          ) : (
            <Link
              href="/"
              className={`
              font-display font-semibold tracking-tighter uppercase
              text-lg 2xl:text-xl 3xl:text-2xl 4xl:text-3xl 5xl:text-4xl 6xl:text-5xl
              hover:opacity-90 transition-opacity shrink-0
              text-slate-900
            `}
              aria-label={`${siteConfig.title} — на главную`}
            >
              {siteConfig.logoText}
            </Link>
          )}
          <AdaptiveNav links={siteConfig.navLinks} variant={isSprintTheme ? 'dark' : 'light'} />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4 2xl:gap-5 3xl:gap-8 4xl:gap-10 5xl:gap-12 6xl:gap-16">
          <div className="hidden 3xl:flex flex-col items-end leading-tight mr-1 3xl:mr-4 4xl:mr-6">
            <a
              href={`tel:${contact.phone.replace(/\s|\(|\)|-/g, '')}`}
              className={`
                font-medium ${isSprintTheme ? 'text-slate-100 hover:text-slate-300' : 'text-slate-900 hover:text-slate-700'}
                text-sm 2xl:text-base 3xl:text-lg 4xl:text-xl 5xl:text-2xl 6xl:text-3xl
              `}
            >
              {contact.phone}
            </a>
            <span className="desktop-microtext-scale text-slate-400 uppercase tracking-tighter">
              Ежедневно 9:00 — 21:00
            </span>
          </div>
          <div className="hidden xl:flex items-center gap-0.5 2xl:gap-1 3xl:gap-2">
            <a
              href={`tel:${contact.phone.replace(/\s|\(|\)|-/g, '')}`}
              className={`rounded-full transition-colors min-h-[44px] min-w-[44px] 2xl:min-h-[52px] 2xl:min-w-[52px] 3xl:min-h-[58px] 3xl:min-w-[58px] flex items-center justify-center shrink-0 p-2 ${
                isSprintTheme ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="Позвонить"
            >
              <PhoneIcon />
            </a>
            <a
              href={`mailto:${contact.email}`}
              className={`rounded-full transition-colors min-h-[44px] min-w-[44px] 2xl:min-h-[52px] 2xl:min-w-[52px] 3xl:min-h-[58px] 3xl:min-w-[58px] flex items-center justify-center shrink-0 p-2 ${
                isSprintTheme ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="Написать на почту"
            >
              <MailIcon />
            </a>
          </div>
          <HeaderCartButton variant={isSprintTheme ? 'dark' : 'light'} />
          <div className="hidden xl:block">
            <HeaderProfileMenu
              variant={isSprintTheme ? 'dark' : 'light'}
              isAuthenticated={isAuthenticated}
              role={session?.user?.role}
            />
          </div>
        </div>
      </div>
    </header>
    </>
  )
}

function PhoneIcon() {
  return (
    <svg className="w-5 h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7 4xl:w-8 4xl:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="w-5 h-5 2xl:w-6 2xl:h-6 3xl:w-7 3xl:h-7 4xl:w-8 4xl:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}
