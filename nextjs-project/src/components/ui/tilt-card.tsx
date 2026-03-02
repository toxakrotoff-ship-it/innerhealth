'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface TiltCardProps {
  children: React.ReactNode
  className?: string
}

/** 3D tilt on pointer move; 30% dark overlay at rest, removed on hover. No foil/glare. */
export function TiltCard({ children, className }: TiltCardProps) {
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
        'group relative w-full min-h-[180px] [perspective:600px]',
        className
      )}
      style={
        {
          '--r-x': '0deg',
          '--r-y': '0deg',
        } as React.CSSProperties
      }
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height
        const factor = 10
        state.current.rotateX = (0.5 - y) * factor
        state.current.rotateY = (x - 0.5) * factor
        updateStyles()
      }}
      onPointerLeave={() => {
        state.current.rotateX = 0
        state.current.rotateY = 0
        updateStyles()
      }}
    >
      <div
        className="relative h-full w-full rounded-2xl border border-gray-200 overflow-hidden transition-[transform,border-color] duration-200 ease-out group-hover:border-action-blue"
        style={{
          transform: 'rotateX(var(--r-y)) rotateY(var(--r-x))',
        }}
      >
        {children}
        {/* 30% dark at rest; removed on hover */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-black/30 transition-opacity duration-300 group-hover:opacity-0"
          aria-hidden
        />
      </div>
    </div>
  )
}
