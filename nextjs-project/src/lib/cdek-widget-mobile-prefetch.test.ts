/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scheduleMobileCountryOfficesPrefetch } from '@/lib/cdek-widget-mobile-prefetch'

describe('cdek-widget-mobile-prefetch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts prefetch only after map becomes visible and idle delay', () => {
    const target = document.createElement('div')
    const onPrefetch = vi.fn()
    let observerCallback: IntersectionObserverCallback | null = null

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback
      }
      observe() {}
      disconnect() {}
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    vi.stubGlobal(
      'requestIdleCallback',
      (callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
        return 1
      }
    )

    scheduleMobileCountryOfficesPrefetch({ target, onPrefetch })
    expect(onPrefetch).not.toHaveBeenCalled()

    observerCallback?.(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      {} as IntersectionObserver
    )

    vi.advanceTimersByTime(1_200)
    expect(onPrefetch).toHaveBeenCalledTimes(1)
  })
})
