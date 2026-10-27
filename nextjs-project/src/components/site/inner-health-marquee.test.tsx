import { act, cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InnerHealthMarquee } from './inner-health-marquee'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('InnerHealthMarquee', () => {
  it('serves a static, accessible copy and hydrates without a mismatch', async () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(<InnerHealthMarquee />)
    document.body.append(container)
    expect(container.querySelector('section')).toHaveAttribute('data-ready', 'false')
    expect(container.querySelector('.animate-marquee-inner')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.inner-health-marquee__static')?.textContent).toContain('ДОСТАВКА ПО РОССИИ')
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <InnerHealthMarquee />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    await act(async () => root.unmount())
    container.remove()
  })

  it('fills both groups and recalculates for viewport and font changes', () => {
    let viewportWidth = 2560
    let stripWidth = 900
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => viewportWidth)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      width: stripWidth, height: 20, x: 0, y: 0, top: 0, right: stripWidth, bottom: 20, left: 0,
      toJSON() {},
    }))
    let resize: () => void = () => {}
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback }
      observe = observe
      disconnect = disconnect
    })
    const { container, unmount } = render(<InnerHealthMarquee />)
    const section = container.querySelector('section')!
    const groups = container.querySelectorAll('.animate-marquee-inner > div')
    const expectCopies = (count: number) => {
      for (const group of groups) expect(group.children).toHaveLength(count)
      expect(groups[0].textContent).toBe(groups[1].textContent)
      expect((groups[0].parentElement as HTMLElement).style.animationDuration).toBe(`${30 * count}s`)
    }
    expect(section).toHaveAttribute('data-ready', 'true')
    expectCopies(3)
    expect(observe).toHaveBeenCalledWith(section)
    expect(observe).toHaveBeenCalledWith(groups[0].firstElementChild)
    // An ultra-wide viewport must not run out of content.
    viewportWidth = 7680
    act(() => resize())
    expectCopies(9)
    // A late font changes the natural width without resizing the viewport.
    stripWidth = 700
    act(() => resize())
    expectCopies(11)
    viewportWidth = 320
    act(() => resize())
    expectCopies(1)
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
