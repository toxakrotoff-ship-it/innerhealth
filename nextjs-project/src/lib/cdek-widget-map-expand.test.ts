/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import {
  attachCdekMapExpandListener,
  shouldTriggerExpandOnPinch,
} from '@/lib/cdek-widget-map-expand'

describe('cdek-widget-map-expand', () => {
  it('detects pinch zoom out when finger distance shrinks', () => {
    expect(shouldTriggerExpandOnPinch(100, 90)).toBe(true)
    expect(shouldTriggerExpandOnPinch(100, 95)).toBe(false)
  })

  it('expands on zoom-out control click', () => {
    const hostEl = document.createElement('div')
    const zoomOutButton = document.createElement('button')
    zoomOutButton.setAttribute('aria-label', 'Уменьшить масштаб')
    zoomOutButton.textContent = '−'
    hostEl.appendChild(zoomOutButton)

    const onExpand = vi.fn()
    attachCdekMapExpandListener(hostEl, onExpand)

    zoomOutButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('ignores wheel zoom on mobile layout', () => {
    const hostEl = document.createElement('div')
    hostEl.classList.add('cdek-widget-host--mobile')
    const onExpand = vi.fn()

    attachCdekMapExpandListener(hostEl, onExpand, { isMobile: true })

    hostEl.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true }))

    expect(onExpand).not.toHaveBeenCalled()
  })

  it('expands after pinch zoom out on touch', () => {
    const hostEl = document.createElement('div')
    const onExpand = vi.fn()
    attachCdekMapExpandListener(hostEl, onExpand, { isMobile: true })

    hostEl.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          { clientX: 0, clientY: 0 } as Touch,
          { clientX: 100, clientY: 0 } as Touch,
        ],
      })
    )
    hostEl.dispatchEvent(
      new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [
          { clientX: 0, clientY: 0 } as Touch,
          { clientX: 80, clientY: 0 } as Touch,
        ],
      })
    )

    expect(onExpand).toHaveBeenCalledTimes(1)
  })
})
