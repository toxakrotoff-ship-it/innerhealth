/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('buffers actions before checkout session creation and sends only safe fields after binding', async () => {
  vi.resetModules()
  vi.useFakeTimers()
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', fetchMock)
  const beaconMock = vi.fn().mockReturnValue(true)
  vi.stubGlobal('navigator', { ...navigator, sendBeacon: beaconMock })
  const { trackCartActivity, bindCartActivitySession } = await import('@/lib/cart-activity-client')

  trackCartActivity({
    scope: 'cart', action: 'cdek_widget_choose',
    data: { deliveryMethod: 'cdek_pvz', pvzCode: 'MSK123', phone: '+79990000000' },
  })
  expect(fetchMock).not.toHaveBeenCalled()

  bindCartActivitySession('session-1', 'inner')
  await vi.runAllTimersAsync()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
  expect(url).toBe('/api/checkout/session/session-1/activity?brand=inner')
  const body = JSON.parse(String(options.body))
  expect(body.events[0].data).toEqual({ deliveryMethod: 'cdek_pvz', pvzCode: 'MSK123' })

  trackCartActivity({ scope: 'cart', action: 'checkout_submit_success' })
  window.dispatchEvent(new Event('pagehide'))
  expect(beaconMock).toHaveBeenCalledTimes(1)

  bindCartActivitySession(null, 'inner')
  trackCartActivity({ scope: 'cart', action: 'page_mounted' })
  bindCartActivitySession('session-2', 'inner')
  await vi.runAllTimersAsync()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1][0]).toBe('/api/checkout/session/session-2/activity?brand=inner')
})
