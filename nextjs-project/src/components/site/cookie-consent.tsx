'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/button'
import type { BrandId } from '@/lib/brand/brand'

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted'

export function CookieConsent({ brandId }: { brandId: BrandId }) {
  const [isVisible, setIsVisible] = useState(false)
  const isSprintTheme = brandId === 'sprint-power'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const accepted = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!accepted) setIsVisible(true)
  }, [])

  function handleAccept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div
      className={
        isSprintTheme
          ? 'fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-[#060A14]/95 p-4 shadow-[0_-10px_30px_-28px_rgba(2,6,23,0.85)] backdrop-blur-md supports-backdrop-filter:bg-[#060A14]/90'
          : 'fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]'
      }
      role="dialog"
      aria-label="Уведомление об использовании cookies"
    >
      <div className="mx-auto flex max-w-[min(90rem,92vw)] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <p
          className={
            isSprintTheme
              ? 'text-center text-sm text-slate-300 sm:text-left'
              : 'text-center text-sm text-gray-700 sm:text-left'
          }
        >
          Мы используем файлы cookie для обеспечения наилучшего взаимодействия с
          сайтом.
        </p>
        <Button
          type="button"
          onClick={handleAccept}
          variant="primary"
          size="default"
          className="shrink-0"
        >
          Да, я согласен(-на)
        </Button>
      </div>
    </div>
  )
}
