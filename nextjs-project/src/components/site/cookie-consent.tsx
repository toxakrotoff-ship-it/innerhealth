'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/button'

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted'

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

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
      className="fixed bottom-0 left-0 right-0 z-50 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] bg-white border-t border-gray-200"
      role="dialog"
      aria-label="Уведомление об использовании cookies"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-700 text-center sm:text-left">
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
