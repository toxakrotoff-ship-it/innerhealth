'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { BrandId } from '@/lib/brand/brand'
import { cn } from '@/lib/utils'
import { ContactHelpForm } from '@/components/site/contact-help-form'

const PANEL_TRANSITION_MS = 220

interface ContactHelpWidgetProps {
  brandId: BrandId
}

export function ContactHelpWidget({ brandId }: ContactHelpWidgetProps) {
  const isSprintTheme = brandId === 'sprint-power'
  const [isOpen, setIsOpen] = useState(false)
  const [isPanelMounted, setIsPanelMounted] = useState(false)
  const [isPanelVisible, setIsPanelVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (isOpen) {
      setIsPanelMounted(true)
      const id = requestAnimationFrame(() => setIsPanelVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setIsPanelVisible(false)
    const t = window.setTimeout(() => setIsPanelMounted(false), PANEL_TRANSITION_MS)
    return () => window.clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target)) return
      setIsOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  return (
    <>
      {isPanelMounted ? (
        <div
          className="fixed inset-0 z-[49] bg-black/20 transition-opacity duration-[220ms] ease-out motion-reduce:transition-none"
          style={{ opacity: isPanelVisible ? 1 : 0 }}
          aria-hidden
        />
      ) : null}

      <div
        className="fixed right-3 sm:right-4 md:right-8 z-50 flex flex-col items-end gap-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        {isPanelMounted ? (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'w-[min(100vw-1.5rem,22.5rem)] overflow-hidden rounded-2xl border shadow-2xl transition-[opacity,transform] duration-[220ms] ease-out motion-reduce:translate-y-0 motion-reduce:transition-none',
              isPanelVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
              isSprintTheme
                ? 'border-slate-700 bg-[#0B1220] text-slate-100'
                : 'border-gray-200 bg-white text-gray-900'
            )}
          >
            <div
              className={cn(
                'flex items-start justify-between gap-3 border-b px-4 py-3',
                isSprintTheme ? 'border-slate-700' : 'border-gray-100'
              )}
            >
              <p id={titleId} className="text-sm font-semibold leading-snug">
                Остались вопросы или нужна помощь? Оставьте контакты и мы свяжемся с вами в ближайшее время
              </p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                  isSprintTheme
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                )}
                aria-label="Закрыть"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[min(70dvh,32rem)] overflow-y-auto p-4">
              <ContactHelpForm isSprintTheme={isSprintTheme} />
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Закрыть форму обратной связи' : 'Остались вопросы? Написать нам'}
          aria-expanded={isOpen}
          className={cn(
            'inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full shadow-xl transition-all hover:-translate-y-0.5',
            isSprintTheme
              ? 'bg-[#7AA2FF] text-[#06101f] hover:bg-[#8fb0ff]'
              : 'bg-action-blue text-white hover:bg-action-blue/90'
          )}
        >
          {isOpen ? (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          )}
        </button>
      </div>
    </>
  )
}
