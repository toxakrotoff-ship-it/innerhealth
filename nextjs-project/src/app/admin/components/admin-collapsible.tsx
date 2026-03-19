'use client'

import type { ReactNode, ReactElement } from 'react'
import { cn } from '@/lib/utils'

/**
 * Smooth height expand/collapse via CSS grid (0fr → 1fr).
 * Respects prefers-reduced-motion.
 */
export function AdminCollapsible({
  open,
  children,
  className,
  innerClassName,
}: {
  open: boolean
  children: ReactNode
  className?: string
  innerClassName?: string
}): ReactElement {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:duration-0 motion-reduce:transition-none',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        className
      )}
      aria-hidden={!open}
    >
      <div className={cn('min-h-0 overflow-hidden', innerClassName)}>{children}</div>
    </div>
  )
}
