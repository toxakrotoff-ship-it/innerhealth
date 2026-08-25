import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const checkoutSessionFindUniqueMock = vi.fn()
const checkoutSessionUpdateMock = vi.fn()
const checkoutSessionUpdateManyMock = vi.fn()
const checkoutSessionFindManyMock = vi.fn()
const checkoutSessionCountMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    checkoutSession: {
      findUnique: (...args: unknown[]) => checkoutSessionFindUniqueMock(...args),
      update: (...args: unknown[]) => checkoutSessionUpdateMock(...args),
      updateMany: (...args: unknown[]) => checkoutSessionUpdateManyMock(...args),
      findMany: (...args: unknown[]) => checkoutSessionFindManyMock(...args),
      count: (...args: unknown[]) => checkoutSessionCountMock(...args),
    },
  },
}))

beforeEach(() => {
  checkoutSessionFindManyMock.mockReset().mockResolvedValue([])
  checkoutSessionCountMock.mockReset().mockResolvedValue(0)
  checkoutSessionFindUniqueMock.mockReset()
  checkoutSessionUpdateMock.mockReset()
  checkoutSessionUpdateManyMock.mockReset()
})

describe('updateSessionStep', () => {
  it('advances lastCompletedStep forward when moving to a later step', async () => {
    checkoutSessionFindUniqueMock.mockResolvedValue({ lastCompletedStep: 'CONTACT' })
    checkoutSessionUpdateMock.mockResolvedValue({ id: 'sess-1', currentStep: 'DELIVERY' })

    const service = await import('@/services/checkout-session.service')
    await service.updateSessionStep('sess-1', 'DELIVERY')

    expect(checkoutSessionUpdateMock).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { currentStep: 'DELIVERY', lastCompletedStep: 'DELIVERY' },
    })
  })

  it('does not roll lastCompletedStep back when a PATCH for an earlier step arrives late', async () => {
    checkoutSessionFindUniqueMock.mockResolvedValue({ lastCompletedStep: 'DELIVERY' })
    checkoutSessionUpdateMock.mockResolvedValue({ id: 'sess-1', currentStep: 'CONTACT' })

    const service = await import('@/services/checkout-session.service')
    await service.updateSessionStep('sess-1', 'CONTACT')

    expect(checkoutSessionUpdateMock).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { currentStep: 'CONTACT', lastCompletedStep: 'DELIVERY' },
    })
  })

  it('returns null when the session does not exist', async () => {
    checkoutSessionFindUniqueMock.mockResolvedValue(null)

    const service = await import('@/services/checkout-session.service')
    const result = await service.updateSessionStep('missing', 'CONTACT')

    expect(result).toBeNull()
    expect(checkoutSessionUpdateMock).not.toHaveBeenCalled()
  })
})

describe('touchActivity', () => {
  it('reactivates an ABANDONED session back to ACTIVE', async () => {
    checkoutSessionFindUniqueMock.mockResolvedValue({ status: 'ABANDONED' })
    checkoutSessionUpdateMock.mockResolvedValue({ id: 'sess-1' })

    const service = await import('@/services/checkout-session.service')
    const result = await service.touchActivity('sess-1')

    expect(result).toEqual({ reactivated: true })
    const call = checkoutSessionUpdateMock.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'sess-1' })
    expect(call.data.status).toBe('ACTIVE')
    expect(call.data.lastActivityAt).toBeInstanceOf(Date)
  })

  it('only bumps lastActivityAt for an already-ACTIVE session, without touching status', async () => {
    checkoutSessionFindUniqueMock.mockResolvedValue({ status: 'ACTIVE' })
    checkoutSessionUpdateMock.mockResolvedValue({ id: 'sess-1' })

    const service = await import('@/services/checkout-session.service')
    const result = await service.touchActivity('sess-1')

    expect(result).toEqual({ reactivated: false })
    const call = checkoutSessionUpdateMock.mock.calls[0][0]
    expect(call.data.status).toBeUndefined()
  })

  it('does nothing for a missing session', async () => {
    checkoutSessionFindUniqueMock.mockResolvedValue(null)

    const service = await import('@/services/checkout-session.service')
    const result = await service.touchActivity('missing')

    expect(result).toEqual({ reactivated: false })
    expect(checkoutSessionUpdateMock).not.toHaveBeenCalled()
  })
})

describe('markSessionsAbandoned', () => {
  it('only flips sessions still ACTIVE, guarding against a race with touchActivity', async () => {
    checkoutSessionUpdateManyMock.mockResolvedValue({ count: 2 })

    const service = await import('@/services/checkout-session.service')
    const result = await service.markSessionsAbandoned(['a', 'b'])

    expect(checkoutSessionUpdateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] }, status: 'ACTIVE' },
      data: { status: 'ABANDONED' },
    })
    expect(result).toEqual({ count: 2 })
  })

  it('short-circuits without a query for an empty id list', async () => {
    const service = await import('@/services/checkout-session.service')
    const result = await service.markSessionsAbandoned([])

    expect(checkoutSessionUpdateManyMock).not.toHaveBeenCalled()
    expect(result).toEqual({ count: 0 })
  })
})

describe('listSessionsForAdmin', () => {
  it('always scopes the query to the requested brand (storefront isolation)', async () => {
    const service = await import('@/services/checkout-session.service')
    await service.listSessionsForAdmin({ brand: 'sprint-power' })

    const call = checkoutSessionFindManyMock.mock.calls[0][0]
    expect(call.where.brand).toBe('sprint-power')
  })

  it('hides COMPLETED sessions by default (ТЗ: не в списке незавершённых по умолчанию)', async () => {
    const service = await import('@/services/checkout-session.service')
    await service.listSessionsForAdmin({ brand: 'inner' })

    const call = checkoutSessionFindManyMock.mock.calls[0][0]
    expect(call.where.status.in).not.toContain('COMPLETED')
  })

  it('includes COMPLETED only when explicitly requested via statuses filter', async () => {
    const service = await import('@/services/checkout-session.service')
    await service.listSessionsForAdmin({ brand: 'inner', statuses: ['COMPLETED'] })

    const call = checkoutSessionFindManyMock.mock.calls[0][0]
    expect(call.where.status.in).toEqual(['COMPLETED'])
  })
})
