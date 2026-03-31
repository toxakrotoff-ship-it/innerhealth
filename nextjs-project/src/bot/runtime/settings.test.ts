import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteSetting: {
      findMany,
    },
  },
}));

describe('bot runtime settings', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers brand-scoped telegram token over unscoped token', async () => {
    findMany.mockResolvedValue([
      { key: 'sprint-power:telegram_bot_token', value: 'scoped-token' },
      { key: 'telegram_bot_token', value: 'fallback-token' },
    ]);

    const { getTelegramBotToken } = await import('@/bot/runtime/settings');
    await expect(getTelegramBotToken({ brandId: 'sprint-power' })).resolves.toBe('scoped-token');
  });

  it('falls back to unscoped max bot settings when scoped settings are missing', async () => {
    findMany.mockResolvedValue([
      { key: 'max_bot_token', value: 'max-token' },
      { key: 'max_bot_mode', value: 'webhook' },
      { key: 'max_bot_webhook_secret', value: 'secret' },
    ]);

    const { getMaxBotSettings } = await import('@/bot/runtime/settings');
    await expect(getMaxBotSettings({ brandId: 'sprint-power' })).resolves.toEqual({
      token: 'max-token',
      mode: 'webhook',
      webhookUrl: undefined,
      webhookSecret: 'secret',
    });
  });
});
