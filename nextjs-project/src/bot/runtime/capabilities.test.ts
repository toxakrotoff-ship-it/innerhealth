import { beforeEach, describe, expect, it, vi } from 'vitest';

const telegramFindUnique = vi.fn();
const maxFindUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    telegramWhitelist: {
      findUnique: telegramFindUnique,
    },
    maxWhitelist: {
      findUnique: maxFindUnique,
    },
  },
}));

describe('bot runtime capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks linked admin telegram users as admins', async () => {
    telegramFindUnique.mockResolvedValue({ user: { role: 'ADMIN' } });

    const { getTelegramBotUserCapabilities } = await import('@/bot/runtime/capabilities');
    await expect(getTelegramBotUserCapabilities('tg-1', { brandId: 'inner' })).resolves.toEqual({
      isLinked: true,
      isAdmin: true,
      isPartner: false,
    });
  });

  it('marks linked max partners as partners only', async () => {
    maxFindUnique.mockResolvedValue({ user: { role: 'PARTNER' } });

    const { getMaxBotUserCapabilities } = await import('@/bot/runtime/capabilities');
    await expect(getMaxBotUserCapabilities('max-1', { brandId: 'sprint-power' })).resolves.toEqual({
      isLinked: true,
      isAdmin: false,
      isPartner: true,
    });
  });

  it('returns unlinked capabilities when whitelist row is missing', async () => {
    telegramFindUnique.mockResolvedValue(null);

    const { getTelegramBotUserCapabilities } = await import('@/bot/runtime/capabilities');
    await expect(getTelegramBotUserCapabilities('tg-missing')).resolves.toEqual({
      isLinked: false,
      isAdmin: false,
      isPartner: false,
    });
  });
});
