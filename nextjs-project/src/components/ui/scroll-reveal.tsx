'use client'

import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/components/ui/use-scroll-reveal'

type ScrollRevealVariant = 'fade-up' | 'fade-right' | 'fade-left' | 'scale'

interface ScrollRevealProps<TElement extends ElementType = 'div'>
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  readonly as?: TElement
  readonly variant?: ScrollRevealVariant
  readonly once?: boolean
  readonly children: ReactNode
}

export function ScrollReveal<TElement extends ElementType = 'div'>(
  props: ScrollRevealProps<TElement>
) {
  const {
    as,
    variant = 'fade-up',
    once = true,
    className,
    children,
    ...rest
  } = props

  const Component = (as ?? 'div') as ElementType
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ once })

  const variantClass =
    variant === 'fade-up'
      ? 'scroll-reveal--fade-up'
      : variant === 'fade-right'
        ? 'scroll-reveal--fade-right'
        : variant === 'fade-left'
          ? 'scroll-reveal--fade-left'
          : 'scroll-reveal--scale'

  return (
    <Component
      ref={ref}
      className={cn(
        'scroll-reveal',
        variantClass,
        isVisible && 'is-visible',
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  )
}

