'use client'

import { useEffect, useRef, useState } from 'react'
import { Xmark } from 'iconoir-react'
import type { BrandId } from '@/lib/brand/brand'

const STORAGE_KEY = 'vpn-notice-dismissed'
const HTML_VISIBLE_CLASS = 'vpn-notice-visible'

export function VpnNoticeBanner({ brandId }: { brandId: BrandId }) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const isSprintTheme = brandId === 'sprint-power'

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY) === 'true') return
    setIsVisible(true)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return

    function clearNoticeLayout() {
      document.documentElement.classList.remove(HTML_VISIBLE_CLASS)
      document.documentElement.style.removeProperty('--vpn-notice-offset')
    }

    if (!isVisible) {
      clearNoticeLayout()
      return
    }

    document.documentElement.classList.add(HTML_VISIBLE_CLASS)

    function updateOffset() {
      const height = bannerRef.current?.offsetHeight ?? 0
      if (height > 0) {
        document.documentElement.style.setProperty('--vpn-notice-offset', `${height}px`)
      }
    }

    updateOffset()
    window.addEventListener('resize', updateOffset)

    return () => {
      window.removeEventListener('resize', updateOffset)
      clearNoticeLayout()
    }
  }, [isVisible])

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div
      ref={bannerRef}
      className={
        isSprintTheme
          ? 'fixed inset-x-0 top-0 z-[60] border-b border-amber-500/30 bg-amber-950/95 pt-[env(safe-area-inset-top)] text-amber-50 backdrop-blur-md'
          : 'fixed inset-x-0 top-0 z-[60] border-b border-amber-300 bg-amber-50 pt-[env(safe-area-inset-top)] text-amber-950'
      }
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex min-h-[2.75rem] max-w-[min(90rem,92vw)] items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <p className="flex-1 text-center text-sm font-medium sm:text-left">
          Для стабильной работы сайта выключите VPN.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className={
            isSprintTheme
              ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-100 transition hover:bg-amber-900/60'
              : 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-900 transition hover:bg-amber-100'
          }
          aria-label="Закрыть уведомление"
        >
          <Xmark className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
