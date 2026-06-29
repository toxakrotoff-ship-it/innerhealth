const ZOOM_OUT_WHEEL_DELTA = 4

export function attachCdekMapExpandListener(
  hostEl: HTMLElement,
  onExpand: () => void
): () => void {
  let triggered = false
  let wheelDelta = 0
  let wheelResetTimer: ReturnType<typeof setTimeout> | null = null

  function triggerExpand() {
    if (triggered) return
    triggered = true
    onExpand()
  }

  function onWheel(event: WheelEvent) {
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

    const zoomControl = target.closest(
      'button[aria-label*="Уменьш"], button[aria-label*="уменьш"], [class*="zoom"][class*="minus"], [class*="zoom"][class*="out"]'
    )
    if (zoomControl) triggerExpand()
  }

  hostEl.addEventListener('wheel', onWheel, { passive: true, capture: true })
  hostEl.addEventListener('click', onClick, { capture: true })

  return () => {
    if (wheelResetTimer != null) clearTimeout(wheelResetTimer)
    hostEl.removeEventListener('wheel', onWheel, { capture: true })
    hostEl.removeEventListener('click', onClick, { capture: true })
  }
}
