import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/services/auth-tokens.service', () => ({
  deleteUnusedPasswordResetTokensForUser: vi.fn().mockResolvedValue({ count: 0 }),
  createPasswordResetToken: vi.fn().mockResolvedValue({ id: 'token-record-1' }),
  deletePasswordResetToken: vi.fn(),
}))

vi.mock('@/lib/password-reset', () => ({
  EXPIRES_MINUTES: 60,
  generateSecureToken: vi.fn(() => 'secret-hex'),
  hashToken: vi.fn(async () => 'hashed'),
  getExpiresAt: vi.fn(() => new Date('2026-07-27T15:00:00Z')),
}))

vi.mock('@/lib/telegram-notify', () => ({
  notifyTelegramPasswordResetForUser: vi.fn(),
}))

vi.mock('@/lib/max-notify', () => ({
  notifyMaxPasswordResetForUser: vi.fn(),
}))

import * as authTokensService from '@/services/auth-tokens.service'
import { notifyMaxPasswordResetForUser } from '@/lib/max-notify'
import { notifyTelegramPasswordResetForUser } from '@/lib/telegram-notify'
import {
  createPasswordResetLink,
  deliverPasswordResetLinkViaMessengers,
  wasPasswordResetDeliveredViaMessenger,
} from './password-reset-link'

describe('createPasswordResetLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invalidates unused tokens and builds reset URL', async () => {
    const result = await createPasswordResetLink({
      userId: 'user-1',
      baseUrl: 'https://innerhealth.ru/',
    })

    expect(authTokensService.deleteUnusedPasswordResetTokensForUser).toHaveBeenCalledWith('user-1')
    expect(authTokensService.createPasswordResetToken).toHaveBeenCalledWith({
      userId: 'user-1',
      tokenHash: 'hashed',
      expiresAt: new Date('2026-07-27T15:00:00Z'),
    })
    expect(result).toEqual({
      resetLink:
        'https://innerhealth.ru/login/reset-password?token=' +
        encodeURIComponent('token-record-1.secret-hex'),
      tokenRecordId: 'token-record-1',
      expiresInMinutes: 60,
    })
  })
})

describe('deliverPasswordResetLinkViaMessengers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports which messengers delivered the link', async () => {
    vi.mocked(notifyTelegramPasswordResetForUser).mockResolvedValue(true)
    vi.mocked(notifyMaxPasswordResetForUser).mockResolvedValue(false)

    const delivery = await deliverPasswordResetLinkViaMessengers({
      userId: 'user-1',
      resetLink: 'https://example.com/reset',
      expiresInMinutes: 60,
    })

    expect(delivery).toEqual({ telegram: true, max: false })
    expect(wasPasswordResetDeliveredViaMessenger(delivery)).toBe(true)
    expect(wasPasswordResetDeliveredViaMessenger({ telegram: false, max: false })).toBe(false)
  })
})
