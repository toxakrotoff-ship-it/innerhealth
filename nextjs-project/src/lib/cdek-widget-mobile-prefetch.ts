const MOBILE_PREFETCH_IDLE_DELAY_MS = 1_200
const MOBILE_PREFETCH_FALLBACK_DELAY_MS = 2_000
const MOBILE_PREFETCH_IDLE_TIMEOUT_MS = 3_500
const MOBILE_PREFETCH_VISIBLE_RATIO = 0.2

export function scheduleMobileCountryOfficesPrefetch(params: {
  target: Element
  onPrefetch: () => void
  signal?: AbortSignal
}): () => void {
  let started = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let idleId: number | null = null

  function cleanupTimers(): void {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
    if (idleId != null && typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(idleId)
      idleId = null
    }
  }

  function startPrefetch(): void {
    if (started || params.signal?.aborted) return
    started = true
    cleanupTimers()
    params.onPrefetch()
  }

  function schedulePrefetch(): void {
    if (started || params.signal?.aborted) return

    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(
        () => {
          idleId = null
          timer = setTimeout(startPrefetch, MOBILE_PREFETCH_IDLE_DELAY_MS)
        },
        { timeout: MOBILE_PREFETCH_IDLE_TIMEOUT_MS }
      )
      return
    }

    timer = setTimeout(startPrefetch, MOBILE_PREFETCH_FALLBACK_DELAY_MS)
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      schedulePrefetch()
    },
    { threshold: MOBILE_PREFETCH_VISIBLE_RATIO }
  )

  observer.observe(params.target)

  return () => {
    observer.disconnect()
    cleanupTimers()
  }
}
