'use client'

import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const MODAL_LAYER_TRANSITION_MS = 220

export interface ModalLayerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Tailwind z-index (e.g. z-50, z-[120]) */
  zClass?: string
  className?: string
  /** Backdrop: color + opacity handled by transition (starts at 0) */
  backdropClassName?: string
  /** Inner panel wrapper (card / content) */
  panelClassName?: string
  /** If true, panel only fades (no translate) — e.g. dense layouts */
  panelFadeOnly?: boolean
  /** Lock document scroll while open */
  lockBodyScroll?: boolean
  dialogProps?: {
    'aria-labelledby'?: string
    'aria-describedby'?: string
    'aria-label'?: string
  }
}

/**
 * Centered modal / lightbox shell: backdrop + panel with enter/exit opacity (optional subtle translate-y).
 * Safe defaults: no scale (avoids positioning glitches); respects `prefers-reduced-motion`.
 */
/** For custom full-screen overlays (lightbox): same mount/visible timing as {@link ModalLayer}. */
export function useModalPresence(open: boolean, durationMs: number = MODAL_LAYER_TRANSITION_MS): {
  mounted: boolean
  visible: boolean
} {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = window.setTimeout(() => setMounted(false), durationMs)
    return () => window.clearTimeout(t)
  }, [open, durationMs])

  return { mounted, visible }
}

export function ModalLayer({
  open,
  onClose,
  children,
  zClass = 'z-50',
  className,
  backdropClassName = 'bg-black/50',
  panelClassName,
  panelFadeOnly = false,
  lockBodyScroll = false,
  dialogProps,
}: ModalLayerProps): ReactElement | null {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = window.setTimeout(() => setMounted(false), MODAL_LAYER_TRANSITION_MS)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!lockBodyScroll || !visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lockBodyScroll, visible])

  useEffect(() => {
    if (!mounted) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mounted, onClose])

  if (!mounted) return null

  const panelMotion = panelFadeOnly
    ? visible
      ? 'opacity-100'
      : 'opacity-0'
    : visible
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-1 sm:translate-y-1.5'

  return (
    <div
      className={cn('fixed inset-0 flex items-center justify-center p-4', zClass, className)}
      role="dialog"
      aria-modal="true"
      {...dialogProps}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 transition-opacity duration-[220ms] ease-out motion-reduce:transition-none',
          backdropClassName,
          visible ? 'opacity-100' : 'opacity-0'
        )}
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 max-h-[min(100dvh,100vh)] w-full min-w-0 overflow-y-auto transition-[opacity,transform] duration-[220ms] ease-out motion-reduce:translate-y-0 motion-reduce:transition-none',
          panelMotion,
          panelClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
