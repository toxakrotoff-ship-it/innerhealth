import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/services/settings.service', () => ({
  getTelegramBotToken: vi.fn(),
}))

vi.mock('@/services/user.service', () => ({
  getInfraAlertTelegramChatIds: vi.fn(),
}))

const settingsService = await import('@/services/settings.service')
const userService = await import('@/services/user.service')

describe('notifyTelegramInfraAlert', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // @ts-expect-error - test env
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('') })
  })

  it('does not call Telegram API when token is missing', async () => {
    vi.mocked(settingsService.getTelegramBotToken).mockResolvedValue(undefined)
    vi.mocked(userService.getInfraAlertTelegramChatIds).mockResolvedValue(['t1'])

    const telegramNotify = await import('@/lib/telegram-notify')
    // @ts-expect-error - function added by feature work
    await telegramNotify.notifyTelegramInfraAlert({
      kind: 'disk',
      severity: 'warn',
      message: 'Disk usage is high',
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does not call Telegram API when there are no recipients', async () => {
    vi.mocked(settingsService.getTelegramBotToken).mockResolvedValue('token')
    vi.mocked(userService.getInfraAlertTelegramChatIds).mockResolvedValue([])

    const telegramNotify = await import('@/lib/telegram-notify')
    // @ts-expect-error - function added by feature work
    await telegramNotify.notifyTelegramInfraAlert({
      kind: 'memory',
      severity: 'critical',
      message: 'RAM is exhausted',
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('calls Telegram API once per recipient', async () => {
    vi.mocked(settingsService.getTelegramBotToken).mockResolvedValue('token')
    vi.mocked(userService.getInfraAlertTelegramChatIds).mockResolvedValue(['t1', 't2'])

    const telegramNotify = await import('@/lib/telegram-notify')
    // @ts-expect-error - function added by feature work
    await telegramNotify.notifyTelegramInfraAlert({
      kind: 'cpu',
      severity: 'critical',
      message: 'CPU is saturated',
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
    const firstCallUrl = vi.mocked(global.fetch).mock.calls[0]?.[0]
    expect(String(firstCallUrl)).toContain('https://api.telegram.org/bottoken/sendMessage')
  })
})

