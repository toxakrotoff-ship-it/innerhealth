import { describe, expect, it, vi } from 'vitest';

const edits = vi.hoisted(() => [] as Array<{ token: string; messageId: string; text: string }>);

vi.mock('@/bot/runtime/settings', () => ({ getTelegramBotToken: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/services/review.service', () => ({
  findReviewById: vi.fn().mockResolvedValue({
    id: 'review-1',
    brand: 'sprint-power',
    authorName: 'Иван',
    text: 'Хороший продукт',
  }),
}));
vi.mock('@/bot/runtime/review-moderation-messages', () => ({
  listReviewModerationMessages: vi.fn().mockResolvedValue([
    { channel: 'MAX', recipientId: '101', messageId: 'sprint-message' },
    { channel: 'MAX_INNER', recipientId: '101', messageId: 'inner-message' },
  ]),
}));
vi.mock('@/bot/runtime/max-config', () => ({
  getMaxBotConfig: vi.fn().mockImplementation(async ({ brandId }) => ({ token: brandId })),
}));
vi.mock('@/lib/telegram-api-fetch', () => ({ telegramApiFetch: vi.fn() }));
vi.mock('@maxhub/max-bot-api', () => ({
  Bot: class MockBot {
    constructor(private token: string) {}
    api = {
      editMessage: async (messageId: string, options: { text: string }) => {
        edits.push({ token: this.token, messageId, text: options.text });
      },
    };
  },
}));

import { syncReviewModerationMessages } from '@/lib/review-moderation-sync';

describe('syncReviewModerationMessages', () => {
  it('updates both bot messages with the source site header', async () => {
    const result = await syncReviewModerationMessages({ reviewId: 'review-1', status: 'APPROVED' });

    expect(result.warnings).toEqual([]);
    expect(edits).toHaveLength(2);
    expect(edits).toEqual(expect.arrayContaining([
      expect.objectContaining({ token: 'sprint-power', messageId: 'sprint-message' }),
      expect.objectContaining({ token: 'inner', messageId: 'inner-message' }),
    ]));
    for (const edit of edits) {
      expect(edit.text).toMatch(/^\*\*Сайт: Sprint Power \(sprintpower\.ru\)\*\*/);
    }
  });
});
