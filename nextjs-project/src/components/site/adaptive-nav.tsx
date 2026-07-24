'use client'

import { useMediaConflictDetection } from '@/hooks/use-overlap-detection'
import type { BrandNavLink } from '@/lib/brand/site-branding'

interface AdaptiveNavProps {
  /** Принудительно использовать мобильный вариант (переопределяет автоматическое определение) */
  forceMobile?: boolean
  links: readonly BrandNavLink[]
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
        gap-8 2xl:gap-10 3xl:gap-12 4xl:gap-14 5xl:gap-16 6xl:gap-20
        text-xs 2xl:text-sm 3xl:text-base 4xl:text-lg 5xl:text-xl 6xl:text-2xl
        font-medium uppercase tracking-widest ${variant === 'dark' ? 'text-slate-300' : 'text-slate-500'}
      `}
      aria-label="Основное меню"
    >
      {links.map(({ label, href }) => (
        <a
          key={href}
          href={href}
          className={`transition-colors whitespace-nowrap ${variant === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}
