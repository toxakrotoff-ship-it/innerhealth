'use client'

import { useEffect, useRef, useState } from 'react'

interface UseScrollRevealOptions {
  readonly once?: boolean
}

interface UseScrollRevealResult<T extends HTMLElement> {
  readonly ref: React.RefCallback<T>
  readonly isVisible: boolean
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

let sharedObserver: IntersectionObserver | null = null
const observerCallbacks = new WeakMap<Element, () => void>()

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || prefersReducedMotion) {
    return null
  }

  if (sharedObserver) {
    return sharedObserver
  }

  sharedObserver = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const callback = observerCallbacks.get(entry.target)
        if (callback) {
          callback()
          obs.unobserve(entry.target)
          observerCallbacks.delete(entry.target)
        }
      }
    },
    {
      root: null,
      threshold: 0.2,
      rootMargin: '0px 0px -10% 0px',
    }
  )

  return sharedObserver
}

export function useScrollReveal<T extends HTMLElement>(
  options: UseScrollRevealOptions = {}
): UseScrollRevealResult<T> {
  const { once = true } = options
  const [isVisible, setIsVisible] = useState(prefersReducedMotion)
  const elementRef = useRef<T | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const element = elementRef.current
    if (!element) {
      return
    }

    const observer = getObserver()
    if (!observer) {
      setIsVisible(true)
      return
    }

    const handleVisible = () => {
      setIsVisible(true)
      if (!once && observer && element) {
        observer.observe(element)
      }
    }

    if (isVisible) {
      return
    }

    observerCallbacks.set(element, () => {
      handleVisible()
    })
    observer.observe(element)

    // iOS Firefox may occasionally miss IntersectionObserver callbacks.
    // Fail-safe prevents elements from staying in low-opacity state forever.
    const fallbackTimeout = window.setTimeout(() => {
      setIsVisible(true)
    }, 1200)

    return () => {
      window.clearTimeout(fallbackTimeout)
      observerCallbacks.delete(element)
      observer.unobserve(element)
    }
  }, [isVisible, once])

  const ref: React.RefCallback<T> = (node) => {
    elementRef.current = node
  }

  return { ref, isVisible }
}

