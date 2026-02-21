import Link from 'next/link'
import Image from 'next/image'
import { HeaderCartButton } from './header-cart-button'
import { HeaderNavMobile } from './header-nav-mobile'

const NAV_LINKS = [
  { label: 'О нас', href: '/o-nas' },
  { label: 'Новости', href: '/news' },
  { label: 'Статьи', href: '/informaciya' },
  { label: 'Каталог', href: '/catalog' },
  { label: 'АКЦИИ', href: '/catalog/aktsii' },
  { label: 'Сотрудничество', href: '/sotrudnichestvo' },
  { label: 'Контакты', href: '/contacts' },
] as const

const PHONE = '+7 (989) 103-91-92'
const EMAIL = 'innerhealth@mail.ru'
const WHATSAPP_URL = 'https://wa.me/79891039192'
const TELEGRAM_URL = 'https://t.me/innerhealth_ih'

const headerIconLink =
  'p-1.5 sm:p-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shrink-0'

export async function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-700 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/90">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Бургер слева (до lg); лого только при полном меню (lg+) и внутри сайдбара */}
          <HeaderNavMobile variant="dark" />

          <div className="hidden lg:block shrink-0 relative h-8 w-[120px]">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-white hover:opacity-90 transition-opacity"
              aria-label="Inner Health — на главную"
            >
              <Image
                src="/logo.png"
                alt="Inner Health"
                fill
                className="object-contain object-left"
                sizes="120px"
                priority
              />
            </Link>
          </div>

          <nav
            className="hidden lg:flex items-center gap-3 xl:gap-4 justify-center flex-1 min-w-0 px-2"
            aria-label="Основное меню"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors py-2"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0 min-w-0">
            <a
              href={`tel:${PHONE.replace(/\s|\(|\)|-/g, '')}`}
              className="hidden sm:block text-sm font-medium text-gray-200 hover:text-white whitespace-nowrap transition-colors"
            >
              {PHONE}
            </a>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <a
                href={`tel:${PHONE.replace(/\s|\(|\)|-/g, '')}`}
                className={headerIconLink}
                aria-label="Позвонить"
              >
                <PhoneIcon />
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className={headerIconLink}
                aria-label="Написать на почту"
              >
                <MailIcon />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={headerIconLink}
                aria-label="WhatsApp"
              >
                <WhatsAppIcon />
              </a>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={headerIconLink}
                aria-label="Telegram"
              >
                <TelegramIcon />
              </a>
            </div>
            <HeaderCartButton variant="dark" />
            <Link
              href="/login"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors whitespace-nowrap min-h-[40px] sm:min-h-[44px] flex items-center shrink-0"
            >
              Войти
            </Link>
          </div>
        </div>
      </div>
    </header>
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

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.865 9.865 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}
