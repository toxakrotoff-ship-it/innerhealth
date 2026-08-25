import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const findStaleActiveSessionsMock = vi.fn()
const markSessionsAbandonedMock = vi.fn()
const createEventMock = vi.fn()

vi.mock('@/services/checkout-session.service', () => ({
  findStaleActiveSessions: (...args: unknown[]) => findStaleActiveSessionsMock(...args),
  markSessionsAbandoned: (...args: unknown[]) => markSessionsAbandonedMock(...args),
  createEvent: (...args: unknown[]) => createEventMock(...args),
}))

beforeEach(() => {
  findStaleActiveSessionsMock.mockReset()
  markSessionsAbandonedMock.mockReset()
  createEventMock.mockReset()
})

describe('scanAndMarkAbandonedCheckouts', () => {
  it('marks stale ACTIVE sessions as ABANDONED and records one event per session', async () => {
    findStaleActiveSessionsMock
      .mockResolvedValueOnce([{ id: 'a', currentStep: 'CART' }, { id: 'b', currentStep: 'CONTACT' }])
      .mockResolvedValueOnce([])
    markSessionsAbandonedMock.mockResolvedValue({ count: 2 })

    const { scanAndMarkAbandonedCheckouts } = await import('@/lib/checkout-abandon-scan-service')
    const result = await scanAndMarkAbandonedCheckouts({ olderThanMinutes: 60 })

    expect(result).toEqual({ scanned: 2, markedAbandoned: 2 })
    expect(markSessionsAbandonedMock).toHaveBeenCalledWith(['a', 'b'])
    expect(createEventMock).toHaveBeenCalledWith('a', 'CHECKOUT_ABANDONED')
    expect(createEventMock).toHaveBeenCalledWith('b', 'CHECKOUT_ABANDONED')
  })

  it('does not touch sessions with a terminal status (findStaleActiveSessions already filters ACTIVE-only)', async () => {
    findStaleActiveSessionsMock.mockResolvedValueOnce([])

    const { scanAndMarkAbandonedCheckouts } = await import('@/lib/checkout-abandon-scan-service')
    const result = await scanAndMarkAbandonedCheckouts({ olderThanMinutes: 60 })

    expect(result).toEqual({ scanned: 0, markedAbandoned: 0 })
    expect(markSessionsAbandonedMock).not.toHaveBeenCalled()
  })

  it('paginates across full batches and stops once a page comes back short', async () => {
    findStaleActiveSessionsMock
      .mockResolvedValueOnce([{ id: 'a', currentStep: 'CART' }])
      .mockResolvedValueOnce([{ id: 'b', currentStep: 'CART' }])
      .mockResolvedValueOnce([])
    markSessionsAbandonedMock.mockResolvedValue({ count: 1 })

    const { scanAndMarkAbandonedCheckouts } = await import('@/lib/checkout-abandon-scan-service')
    const result = await scanAndMarkAbandonedCheckouts({ olderThanMinutes: 60, batchSize: 1 })

    expect(findStaleActiveSessionsMock).toHaveBeenCalledTimes(3)
    expect(result).toEqual({ scanned: 2, markedAbandoned: 2 })
  })
})
