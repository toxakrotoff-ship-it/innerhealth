import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const findManyMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}))

describe('getInfraAlertTelegramChatIds', () => {
  beforeEach(() => {
    findManyMock.mockReset()
  })

  it('returns only telegramUserIds for opted-in admins with linked Telegram', async () => {
    findManyMock.mockResolvedValue([
      { telegramWhitelist: { telegramUserId: 't1' } },
      { telegramWhitelist: { telegramUserId: 't2' } },
    ])

    const userService = await import('@/services/user.service')
    // @ts-expect-error - function added by feature work
    const chatIds = await userService.getInfraAlertTelegramChatIds()
    expect(chatIds).toEqual(['t1', 't2'])

    expect(findManyMock).toHaveBeenCalledTimes(1)
    expect(findManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: { role: 'ADMIN', infraAlertsEnabled: true },
    })
  })

  it('returns empty array when no recipients found', async () => {
    findManyMock.mockResolvedValue([])
    const userService = await import('@/services/user.service')
    // @ts-expect-error - function added by feature work
    const chatIds = await userService.getInfraAlertTelegramChatIds()
    expect(chatIds).toEqual([])
  })
})

