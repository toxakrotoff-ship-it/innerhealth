import { beforeEach, describe, expect, it, vi } from 'vitest';

const telegramLinkFindFirst = vi.fn();
const telegramTxDelete = vi.fn();
const telegramTxUpsert = vi.fn();
const maxLinkFindFirst = vi.fn();
const maxTxDelete = vi.fn();
const maxTxUpsert = vi.fn();
const tx = {
  telegramLinkCode: { delete: telegramTxDelete },
  telegramWhitelist: { upsert: telegramTxUpsert },
  maxLinkCode: { delete: maxTxDelete },
  maxWhitelist: { upsert: maxTxUpsert },
};
const transaction = vi.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx));
const moderationUpsert = vi.fn();
const moderationFindMany = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    telegramLinkCode: { findFirst: telegramLinkFindFirst },
    maxLinkCode: { findFirst: maxLinkFindFirst },
    reviewModerationMessage: {
      upsert: moderationUpsert,
      findMany: moderationFindMany,
    },
    $transaction: transaction,
  },
}));

describe('bot runtime link and moderation storage helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirms brand-scoped telegram links and updates whitelist in a transaction', async () => {
    telegramLinkFindFirst.mockResolvedValue({
      brand: 'sprint-power',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const { confirmTelegramLinkAndReturnUserId } = await import('@/bot/runtime/telegram-links');
    await expect(confirmTelegramLinkAndReturnUserId('code-1', 'tg-1')).resolves.toEqual({
      userId: 'user-1',
      brandId: 'sprint-power',
    });
    expect(telegramTxDelete).toHaveBeenCalled();
    expect(telegramTxUpsert).toHaveBeenCalled();
  });

  it('confirms brand-scoped max links and updates whitelist in a transaction', async () => {
    maxLinkFindFirst.mockResolvedValue({
      brand: 'inner',
      userId: 'user-2',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const { confirmMaxLinkAndReturnUserId } = await import('@/bot/runtime/max-links');
    await expect(confirmMaxLinkAndReturnUserId('code-2', 'max-2')).resolves.toEqual({
      userId: 'user-2',
      brandId: 'inner',
    });
    expect(maxTxDelete).toHaveBeenCalled();
    expect(maxTxUpsert).toHaveBeenCalled();
  });

  it('stores and lists moderation message ids', async () => {
    moderationFindMany.mockResolvedValue([
      { channel: 'TELEGRAM', recipientId: 'tg-1', messageId: '10' },
    ]);

    const {
      upsertReviewModerationMessage,
      listReviewModerationMessages,
    } = await import('@/bot/runtime/review-moderation-messages');
    await upsertReviewModerationMessage({
      reviewId: 'review-1',
      channel: 'TELEGRAM',
      recipientId: 'tg-1',
      messageId: '10',
    });
    await expect(listReviewModerationMessages('review-1')).resolves.toEqual([
      { channel: 'TELEGRAM', recipientId: 'tg-1', messageId: '10' },
    ]);
    expect(moderationUpsert).toHaveBeenCalled();
  });
});
