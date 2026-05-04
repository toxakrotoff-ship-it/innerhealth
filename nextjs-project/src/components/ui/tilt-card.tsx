'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
  /**
   * Тёмная витрина (Sprint): рамка slate + акцент #7AA2FF, без серой «inner»-обводки.
   * Для светлого каталога Inner оставляйте `default`.
   */
  variant?: 'default' | 'dark'
}

/** 3D tilt on pointer move; 30% dark overlay at rest, removed on hover. No foil/glare. */
export function TiltCard({ children, className, variant = 'default' }: TiltCardProps) {
  const isDark = variant === 'dark'
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef({ rotateX: 0, rotateY: 0 })

  const updateStyles = () => {
    if (ref.current) {
      ref.current.style.setProperty('--r-x', `${state.current.rotateY}deg`)
      ref.current.style.setProperty('--r-y', `${state.current.rotateX}deg`)
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        'group relative w-full min-h-[180px] perspective-[600px]',
        className
      )}
      style={
        {
          '--r-x': '0deg',
          '--r-y': '0deg',
        } as React.CSSProperties
      }
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height
        const factor = 10
        state.current.rotateX = (0.5 - y) * factor
        state.current.rotateY = (x - 0.5) * factor
        updateStyles()
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return
        state.current.rotateX = 0
        state.current.rotateY = 0
        updateStyles()
      }}
    >
      <div
        className={cn(
          'relative h-full w-full overflow-hidden rounded-2xl border transition-[transform,border-color] duration-200 ease-out',
          isDark
            ? 'border-slate-600/85 group-hover:border-[#7AA2FF]/90'
            : 'border-gray-200 group-hover:border-action-blue'
        )}
        style={{
          transform: 'rotateX(var(--r-y)) rotateY(var(--r-x))',
        }}
      >
        {children}
        {/* Dark overlay at rest; removed on hover so photo reads like catalog grid */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 group-hover:opacity-0',
            isDark ? 'bg-black/15 md:bg-black/28' : 'bg-black/12 md:bg-black/30'
          )}
          aria-hidden
        />
      </div>
    </div>
  )
}
