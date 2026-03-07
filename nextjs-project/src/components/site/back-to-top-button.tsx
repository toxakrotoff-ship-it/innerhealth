'use client'

import { useEffect, useState } from 'react'

const SHOW_AFTER_SCROLL_Y = 320

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setIsVisible(window.scrollY > SHOW_AFTER_SCROLL_Y)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Наверх"
      title="Наверх"
      className={`fixed bottom-8 right-8 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 shadow-xl transition-all hover:text-action-blue hover:-translate-y-1 ${
        isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  )
}
