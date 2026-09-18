'use client'

import { useMediaConflictDetection } from '@/hooks/use-overlap-detection'
import type { BrandNavDropdown, BrandNavEntry, BrandNavLink } from '@/lib/brand/site-branding'
import { HeaderNavDropdown } from './header-nav-dropdown'

function isDropdownEntry(entry: BrandNavEntry): entry is BrandNavDropdown {
  return (entry as BrandNavLink).href === undefined
}

interface AdaptiveNavProps {
  /** Принудительно использовать мобильный вариант (переопределяет автоматическое определение) */
  forceMobile?: boolean
  links: readonly BrandNavEntry[]
  variant?: 'light' | 'dark'
}

/**
 * Адаптивная навигация, которая автоматически переключается на мобильный вариант
 * при обнаружении конфликта медиа-запросов (когда десктопное и мобильное меню видны одновременно).
 *
 * Поддерживает экраны до 5K+ (5120px / 6xl брейкпоинт) с адаптивным масштабированием.
 */
export function AdaptiveNav({ forceMobile = false, links, variant = 'light' }: AdaptiveNavProps) {
  const hasConflict = useMediaConflictDetection()
  const useMobile = forceMobile || hasConflict

  // Если обнаружен конфликт, не рендерим десктопное меню вообще
  if (useMobile) {
    return null
  }

  return (
    <nav
      className={`
        hidden xl:flex items-center
        gap-5 2xl:gap-5 3xl:gap-8 4xl:gap-10 5xl:gap-12 6xl:gap-16
        text-xs 2xl:text-sm 3xl:text-base 4xl:text-lg 5xl:text-xl 6xl:text-2xl
        font-medium uppercase tracking-widest ${variant === 'dark' ? 'text-slate-300' : 'text-slate-500'}
      `}
      aria-label="Основное меню"
    >
      {links.map((entry) =>
        isDropdownEntry(entry) ? (
          <HeaderNavDropdown key={entry.label} label={entry.label} items={entry.items} variant={variant} />
        ) : (
          <a
            key={entry.href}
            href={entry.href}
            className={`transition-colors whitespace-nowrap ${variant === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`}
          >
            {entry.label}
          </a>
        )
      )}
    </nav>
  )
}
