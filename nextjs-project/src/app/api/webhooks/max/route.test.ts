import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  getClientIdentifier: vi.fn().mockReturnValue('client-1'),
}));
vi.mock('@/bot/runtime/max-config', () => ({
  getMaxBotConfig: vi.fn().mockResolvedValue({
    token: 'token',
    mode: 'webhook',
    webhookSecret: 'webhook-secret',
  }),
}));
vi.mock('@/bot/runtime/capabilities', () => ({
  getMaxBotUserCapabilities: vi.fn().mockResolvedValue({
    isLinked: true,
    isAdmin: true,
    isPartner: false,
  }),
}));
vi.mock('@/lib/review-moderation-action', () => ({
  moderateReviewAndSync: vi.fn().mockResolvedValue({
    success: true,
    status: 'APPROVED',
    reason: 'updated',
    message: 'Отзыв размещён на сайте.',
    syncWarnings: [],
  }),
}));
vi.mock('@/lib/max-notify', () => ({
  notifyMaxConnection: vi.fn(),
}));
vi.mock('@/lib/cdek-shipment-action', () => ({
  createCdekShipmentForOrder: vi.fn(),
}));

import { moderateReviewAndSync } from '@/lib/review-moderation-action';
import { createCdekShipmentForOrder } from '@/lib/cdek-shipment-action';
import { POST } from '@/app/api/webhooks/max/route';

const originalNodeEnv = process.env.NODE_ENV;

describe('POST /api/webhooks/max moderation callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'production';
  });

  it('moderates review from callback payload and returns ok', async () => {
    const request = new Request('https://localhost/api/webhooks/max?brand=sprint-power', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-proto': 'https',
        'x-max-bot-api-secret': 'webhook-secret',
      },
      body: JSON.stringify({
        update_type: 'message_callback',
        callback: {
          callback_id: 'cb-1',
          payload: 'review_approve_review-1',
          user: { user_id: '42' },
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(moderateReviewAndSync).toHaveBeenCalledWith({
      reviewId: 'review-1',
      status: 'APPROVED',
      channel: 'MAX',
    });
  });

  it('creates cdek shipment from callback payload and returns ok', async () => {
    vi.mocked(createCdekShipmentForOrder).mockResolvedValue({
      success: true,
      uuid: 'uuid-1',
      trackNumber: null,
    });

    const request = new Request('https://localhost/api/webhooks/max?brand=inner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-proto': 'https',
        'x-max-bot-api-secret': 'webhook-secret',
      },
      body: JSON.stringify({
        update_type: 'message_callback',
        callback: {
          callback_id: 'cb-2',
          payload: 'cdek_create_order-1',
          user: { user_id: '42' },
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(createCdekShipmentForOrder).toHaveBeenCalledWith('order-1');
  });
});

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
});
