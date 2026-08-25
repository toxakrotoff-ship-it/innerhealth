import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const findActiveSessionByGuestTokenMock = vi.fn()
const findActiveSessionByUserIdMock = vi.fn()
const createSessionMock = vi.fn()
const claimSessionForUserMock = vi.fn()
const touchActivityMock = vi.fn()
const createEventMock = vi.fn()
const findSessionByIdMock = vi.fn()
const updateSessionContactMock = vi.fn()
const updateSessionStepMock = vi.fn()
const updateSessionCartMock = vi.fn()

vi.mock('@/services/checkout-session.service', () => ({
  findActiveSessionByGuestToken: (...args: unknown[]) => findActiveSessionByGuestTokenMock(...args),
  findActiveSessionByUserId: (...args: unknown[]) => findActiveSessionByUserIdMock(...args),
  createSession: (...args: unknown[]) => createSessionMock(...args),
  claimSessionForUser: (...args: unknown[]) => claimSessionForUserMock(...args),
  touchActivity: (...args: unknown[]) => touchActivityMock(...args),
  createEvent: (...args: unknown[]) => createEventMock(...args),
  findSessionById: (...args: unknown[]) => findSessionByIdMock(...args),
  updateSessionContact: (...args: unknown[]) => updateSessionContactMock(...args),
  updateSessionStep: (...args: unknown[]) => updateSessionStepMock(...args),
  updateSessionCart: (...args: unknown[]) => updateSessionCartMock(...args),
}))

beforeEach(() => {
  findActiveSessionByGuestTokenMock.mockReset()
  findActiveSessionByUserIdMock.mockReset()
  createSessionMock.mockReset()
  claimSessionForUserMock.mockReset()
  touchActivityMock.mockReset().mockResolvedValue({ reactivated: false })
  createEventMock.mockReset()
  findSessionByIdMock.mockReset()
  updateSessionContactMock.mockReset()
  updateSessionStepMock.mockReset()
  updateSessionCartMock.mockReset()
})

describe('startCheckout', () => {
  it('creates a new guest session with a fresh token when none is provided', async () => {
    findActiveSessionByGuestTokenMock.mockResolvedValue(null)
    createSessionMock.mockResolvedValue({ id: 'sess-1' })

    const { startCheckout } = await import('@/lib/checkout-tracking')
    const result = await startCheckout({ brand: 'inner' })

    expect(createSessionMock).toHaveBeenCalledTimes(1)
    expect(result.guestToken).toBeTruthy()
    expect(result.session).toEqual({ id: 'sess-1' })
    expect(createEventMock).toHaveBeenCalledWith('sess-1', 'CHECKOUT_STARTED', 'CART')
  })

  it('reuses the existing guest session for the same guestToken instead of creating a duplicate', async () => {
    findActiveSessionByGuestTokenMock.mockResolvedValue({ id: 'sess-existing' })

    const { startCheckout } = await import('@/lib/checkout-tracking')
    const result = await startCheckout({ brand: 'inner', guestToken: 'tok-abc' })

    expect(createSessionMock).not.toHaveBeenCalled()
    expect(touchActivityMock).toHaveBeenCalledWith('sess-existing')
    expect(result.session).toEqual({ id: 'sess-existing' })
    expect(result.guestToken).toBe('tok-abc')
  })

  it('reuses the guest session and claims it for the user on login instead of creating a second session', async () => {
    findActiveSessionByUserIdMock.mockResolvedValue(null)
    findActiveSessionByGuestTokenMock.mockResolvedValue({ id: 'sess-guest' })
    claimSessionForUserMock.mockResolvedValue({ id: 'sess-guest', userId: 'user-1' })

    const { startCheckout } = await import('@/lib/checkout-tracking')
    const result = await startCheckout({ brand: 'inner', userId: 'user-1', guestToken: 'tok-abc' })

    expect(createSessionMock).not.toHaveBeenCalled()
    expect(claimSessionForUserMock).toHaveBeenCalledWith('sess-guest', 'user-1')
    expect(result.session).toEqual({ id: 'sess-guest', userId: 'user-1' })
    expect(result.guestToken).toBeNull()
  })

  it('reuses the existing user session on repeated reload without creating a duplicate', async () => {
    findActiveSessionByUserIdMock.mockResolvedValue({ id: 'sess-user' })

    const { startCheckout } = await import('@/lib/checkout-tracking')
    const result = await startCheckout({ brand: 'inner', userId: 'user-1' })

    expect(createSessionMock).not.toHaveBeenCalled()
    expect(result.session).toEqual({ id: 'sess-user' })
  })
})

describe('updateCheckoutContact ownership', () => {
  it('throws CheckoutSessionNotFoundError for a wrong/missing guestToken', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', userId: null, guestToken: 'real-token' })

    const { updateCheckoutContact, CheckoutSessionNotFoundError } = await import(
      '@/lib/checkout-tracking'
    )

    await expect(
      updateCheckoutContact(
        'sess-1',
        { guestToken: 'wrong-token', userId: null },
        { phone: '+79990000000' }
      )
    ).rejects.toBeInstanceOf(CheckoutSessionNotFoundError)
    expect(updateSessionContactMock).not.toHaveBeenCalled()
  })

  it('throws CheckoutSessionNotFoundError when the session does not exist', async () => {
    findSessionByIdMock.mockResolvedValue(null)

    const { updateCheckoutContact, CheckoutSessionNotFoundError } = await import(
      '@/lib/checkout-tracking'
    )

    await expect(
      updateCheckoutContact('missing', { guestToken: 'tok', userId: null }, { phone: '+79990000000' })
    ).rejects.toBeInstanceOf(CheckoutSessionNotFoundError)
  })

  it('updates contact and advances the step for a matching guestToken', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', userId: null, guestToken: 'real-token' })
    updateSessionStepMock.mockResolvedValue({ id: 'sess-1', currentStep: 'CONTACT' })

    const { updateCheckoutContact } = await import('@/lib/checkout-tracking')
    const result = await updateCheckoutContact(
      'sess-1',
      { guestToken: 'real-token', userId: null },
      { phone: '+79990000000' }
    )

    expect(updateSessionContactMock).toHaveBeenCalledWith('sess-1', { phone: '+79990000000' })
    expect(createEventMock).toHaveBeenCalledWith('sess-1', 'CONTACT_ENTERED', 'CONTACT')
    expect(result).toEqual({ id: 'sess-1', currentStep: 'CONTACT' })
  })

  it('allows a logged-in user to update their own session by userId, without a guestToken', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', userId: 'user-1', guestToken: null })
    updateSessionStepMock.mockResolvedValue({ id: 'sess-1', currentStep: 'CONTACT' })

    const { updateCheckoutContact } = await import('@/lib/checkout-tracking')
    await updateCheckoutContact('sess-1', { guestToken: null, userId: 'user-1' }, { fullName: 'Иван' })

    expect(updateSessionContactMock).toHaveBeenCalledWith('sess-1', { fullName: 'Иван' })
  })
})

describe('updateCheckoutCart', () => {
  it('stores the cart snapshot for an owned session, and re-stores it on a repeated call', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', userId: null, guestToken: 'tok-1' })
    updateSessionCartMock
      .mockResolvedValueOnce({ id: 'sess-1', cartItemsCount: 1 })
      .mockResolvedValueOnce({ id: 'sess-1', cartItemsCount: 2 })

    const { updateCheckoutCart } = await import('@/lib/checkout-tracking')
    const owner = { guestToken: 'tok-1', userId: null }

    const first = await updateCheckoutCart('sess-1', owner, {
      cartSnapshot: [{ productId: 'p1', quantity: 1, price: 100 }],
      cartItemsCount: 1,
    })
    const second = await updateCheckoutCart('sess-1', owner, {
      cartSnapshot: [{ productId: 'p1', quantity: 2, price: 100 }],
      cartItemsCount: 2,
    })

    expect(first).toEqual({ id: 'sess-1', cartItemsCount: 1 })
    expect(second).toEqual({ id: 'sess-1', cartItemsCount: 2 })
    expect(updateSessionCartMock).toHaveBeenCalledTimes(2)
  })

  it('throws CheckoutSessionNotFoundError for a wrong guestToken', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', userId: null, guestToken: 'real-token' })

    const { updateCheckoutCart, CheckoutSessionNotFoundError } = await import('@/lib/checkout-tracking')

    await expect(
      updateCheckoutCart(
        'sess-1',
        { guestToken: 'wrong-token', userId: null },
        { cartSnapshot: [], cartItemsCount: 0 }
      )
    ).rejects.toBeInstanceOf(CheckoutSessionNotFoundError)
    expect(updateSessionCartMock).not.toHaveBeenCalled()
  })
})

describe('reactivation after abandonment (full path: cron tick -> ABANDONED -> PATCH contact -> ACTIVE)', () => {
  it('records CHECKOUT_REACTIVATED when a PATCH on an ABANDONED session reactivates it', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', userId: null, guestToken: 'tok-1' })
    // Симулирует состояние сессии после тика cron-скана (PR5): ABANDONED -> touchActivity
    // возвращает reactivated:true.
    touchActivityMock.mockResolvedValue({ reactivated: true })
    updateSessionStepMock.mockResolvedValue({ id: 'sess-1', status: 'ACTIVE', currentStep: 'CONTACT' })

    const { updateCheckoutContact } = await import('@/lib/checkout-tracking')
    await updateCheckoutContact('sess-1', { guestToken: 'tok-1', userId: null }, { phone: '+79990000000' })

    expect(createEventMock).toHaveBeenCalledWith('sess-1', 'CHECKOUT_REACTIVATED')
    // Старое событие CHECKOUT_ABANDONED (записанное cron-сканом) не удаляется — сервис
    // только добавляет новое событие, ничего не чистит (см. checkout-abandon-scan-service.ts).
    expect(createEventMock).toHaveBeenCalledWith('sess-1', 'CONTACT_ENTERED', 'CONTACT')
  })

  it('does not record CHECKOUT_REACTIVATED for a session that was already ACTIVE', async () => {
    findSessionByIdMock.mockResolvedValue({ id: 'sess-1', userId: null, guestToken: 'tok-1' })
    touchActivityMock.mockResolvedValue({ reactivated: false })
    updateSessionStepMock.mockResolvedValue({ id: 'sess-1', status: 'ACTIVE', currentStep: 'CONTACT' })

    const { updateCheckoutContact } = await import('@/lib/checkout-tracking')
    await updateCheckoutContact('sess-1', { guestToken: 'tok-1', userId: null }, { phone: '+79990000000' })

    expect(createEventMock).not.toHaveBeenCalledWith('sess-1', 'CHECKOUT_REACTIVATED')
  })
})
