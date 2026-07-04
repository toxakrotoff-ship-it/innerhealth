const ZOOM_OUT_WHEEL_DELTA = 4
const PINCH_ZOOM_OUT_RATIO = 0.92

export function shouldTriggerExpandOnPinch(
  previousDistance: number,
  currentDistance: number,
  ratio: number = PINCH_ZOOM_OUT_RATIO
): boolean {
  if (previousDistance <= 0 || currentDistance <= 0) return false
  return currentDistance < previousDistance * ratio
}

export function getTouchPairDistance(touches: TouchList): number {
  if (touches.length < 2) return 0
  const first = touches[0]
  const second = touches[1]
  if (!first || !second) return 0
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
}

function isZoomOutControl(target: Element): boolean {
  const button = target.closest('button')
  if (!button) return false

  const ariaLabel = button.getAttribute('aria-label') ?? ''
  if (/уменьш|zoom out|zoom-out|minus/i.test(ariaLabel)) return true

  const className = button.className ?? ''
  if (/zoom.*out|zoom.*minus|minus|decrease/i.test(className)) return true

  const text = button.textContent?.trim() ?? ''
  return text === '−' || text === '-' || text === '–'
}

export function attachCdekMapExpandListener(
  hostEl: HTMLElement,
  onExpand: () => void,
  options?: { isMobile?: boolean }
): () => void {
  const isMobile =
    options?.isMobile ?? hostEl.closest('.cdek-widget-host--mobile') != null

  let triggered = false
  let wheelDelta = 0
  let wheelResetTimer: ReturnType<typeof setTimeout> | null = null
  let lastPinchDistance = 0

  function triggerExpand() {
    if (triggered) return
    triggered = true
    onExpand()
  }

  function resetPinchTracking() {
    lastPinchDistance = 0
  }

  function onWheel(event: WheelEvent) {
    // Mobile layout in DevTools still emits wheel; real phones use pinch instead.
    if (isMobile) return

    if (event.deltaY <= 0) {
      wheelDelta = 0
      return
    }

    wheelDelta += event.deltaY
    if (wheelResetTimer != null) clearTimeout(wheelResetTimer)
    wheelResetTimer = setTimeout(() => {
      wheelDelta = 0
      wheelResetTimer = null
    }, 400)

    if (wheelDelta >= ZOOM_OUT_WHEEL_DELTA) {
      triggerExpand()
    }
  }

  function onClick(event: MouseEvent) {
    const target = event.target
    if (!(target instanceof Element)) return
    if (isZoomOutControl(target)) triggerExpand()
  }

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length === 2) {
      lastPinchDistance = getTouchPairDistance(event.touches)
      return
    }
    resetPinchTracking()
  }

  function onTouchMove(event: TouchEvent) {
    if (event.touches.length !== 2) return

    const currentDistance = getTouchPairDistance(event.touches)
    if (shouldTriggerExpandOnPinch(lastPinchDistance, currentDistance)) {
      triggerExpand()
    }
    lastPinchDistance = currentDistance
  }

  function onTouchEnd(event: TouchEvent) {
    if (event.touches.length >= 2) {
      lastPinchDistance = getTouchPairDistance(event.touches)
      return
    }
    resetPinchTracking()
  }

  const listenerOptions: AddEventListenerOptions = { passive: true, capture: true }

  hostEl.addEventListener('wheel', onWheel, listenerOptions)
  hostEl.addEventListener('click', onClick, listenerOptions)
  hostEl.addEventListener('touchstart', onTouchStart, listenerOptions)
  hostEl.addEventListener('touchmove', onTouchMove, listenerOptions)
  hostEl.addEventListener('touchend', onTouchEnd, listenerOptions)
  hostEl.addEventListener('touchcancel', onTouchEnd, listenerOptions)

  return () => {
    if (wheelResetTimer != null) clearTimeout(wheelResetTimer)
    hostEl.removeEventListener('wheel', onWheel, { capture: true })
    hostEl.removeEventListener('click', onClick, { capture: true })
    hostEl.removeEventListener('touchstart', onTouchStart, { capture: true })
    hostEl.removeEventListener('touchmove', onTouchMove, { capture: true })
    hostEl.removeEventListener('touchend', onTouchEnd, { capture: true })
    hostEl.removeEventListener('touchcancel', onTouchEnd, { capture: true })
  }
}
