'use client'

import { useEffect, useMemo, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import Link from 'next/link'
import Image from 'next/image'
import { ModalLayer } from '@/components/ui/modal-layer'

function extractPlainTextFromTiptap(content: JSONContent | null): string {
  if (!content?.content) return ''

  const out: string[] = []
  const stack: JSONContent[] = [...content.content]

  while (stack.length > 0) {
    const node = stack.shift()
    if (!node) continue
    if (typeof node.text === 'string') out.push(node.text)
    if (Array.isArray(node.content)) stack.unshift(...node.content)
  }

  return out.join(' ').replace(/\s+/g, ' ').trim()
}

export interface SitePopupDto {
  id: string
  title: string
  isEnabled: boolean
  richJson: JSONContent | null
  imageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  delaySeconds: number
  hideForDays: number
  autoCloseSeconds: number | null
}

interface HomePopupClientProps {
  popup: SitePopupDto | null
}

export function HomePopupClient({ popup }: HomePopupClientProps) {
  const [isOpen, setIsOpen] = useState(false)

  const storageKey = useMemo(
    () => (popup ? `innerhealth_site_popup_${popup.id}` : null),
    [popup?.id]
  )

  useEffect(() => {
    if (!popup || !popup.isEnabled || !storageKey) return

    const entryRaw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
    if (entryRaw) {
      try {
        const parsed = JSON.parse(entryRaw) as { closedAt: string }
        const closedAt = new Date(parsed.closedAt)
        const now = new Date()
        const diffDays = (now.getTime() - closedAt.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays < popup.hideForDays) {
          return
        }
      } catch {
        // ignore parse errors and treat as not shown
      }
    }

    const delay = Math.max(0, popup.delaySeconds) * 1000
    const delayTimer = window.setTimeout(() => {
      setIsOpen(true)
    }, delay)

    let autoCloseTimer: number | null = null
    if (popup.autoCloseSeconds && popup.autoCloseSeconds > 0) {
      autoCloseTimer = window.setTimeout(() => {
        setIsOpen(false)
        persistClosed()
      }, (popup.delaySeconds + popup.autoCloseSeconds) * 1000)
    }

    function persistClosed() {
      if (!storageKey) return
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ closedAt: new Date().toISOString() })
        )
      } catch {
        // ignore
      }
    }

    return () => {
      window.clearTimeout(delayTimer)
      if (autoCloseTimer != null) window.clearTimeout(autoCloseTimer)
    }
  }, [popup, storageKey])

  if (!popup || !popup.isEnabled) return null

  const handleClose = () => {
    setIsOpen(false)
    if (!storageKey) return
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ closedAt: new Date().toISOString() })
      )
    } catch {
      // ignore
    }
  }

  const plainText = extractPlainTextFromTiptap(popup.richJson ?? null)

  return (
    <ModalLayer
      open={isOpen}
      onClose={handleClose}
      zClass="z-40"
      backdropClassName="bg-black/40"
      panelClassName="w-full max-w-[min(94vw,44rem)] 2xl:max-w-[min(90vw,52rem)]"
      lockBodyScroll
      dialogProps={{ 'aria-label': popup.title }}
    >
      <div className="relative rounded-2xl bg-white shadow-2xl 2xl:rounded-3xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:scale-105 hover:bg-red-500 hover:text-white hover:shadow-lg 2xl:right-4 2xl:top-4 2xl:h-11 2xl:w-11"
          aria-label="Закрыть уведомление"
        >
          <span className="text-lg leading-none 2xl:text-xl">&times;</span>
        </button>
        {popup.imageUrl && (
          <div className="relative h-44 w-full overflow-hidden rounded-t-2xl sm:h-48 2xl:h-60 2xl:rounded-t-3xl 3xl:h-64">
            <Image
              src={popup.imageUrl}
              alt={popup.title}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}
        <div className="space-y-3 p-5 sm:p-6 2xl:space-y-4 2xl:p-8">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl 2xl:text-2xl">{popup.title}</h2>
          {plainText && (
            <p className="whitespace-pre-line text-sm text-gray-700 sm:text-base 2xl:text-lg">{plainText}</p>
          )}
          {popup.ctaLabel && popup.ctaUrl && (
            <div className="pt-2 flex justify-center">
              <Link
                href={popup.ctaUrl}
                onClick={handleClose}
                className="desktop-button-scale inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-action-blue"
              >
                {popup.ctaLabel}
              </Link>
            </div>
          )}
        </div>
      </div>
    </ModalLayer>
  )
}

