import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/review-moderation-action', () => ({
  moderateReviewAndSync: vi.fn(),
}));

import { moderateReviewAndSync } from '@/lib/review-moderation-action';
import { POST } from '@/app/api/admin/reviews/moderation-sync/route';

const originalSecret = process.env.TELEGRAM_SERVICE_SECRET;

describe('POST /api/admin/reviews/moderation-sync', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_SERVICE_SECRET = 'test-secret';
  });

  it('returns unauthorized without valid service key', async () => {
    const request = new Request('http://localhost/api/admin/reviews/moderation-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: 'r1', status: 'REJECTED' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      reason: 'unauthorized',
      message: 'Доступ только для администраторов.',
      syncWarnings: [],
    });
    expect(moderateReviewAndSync).not.toHaveBeenCalled();
  });

  it('uses shared moderation action and returns normalized result', async () => {
    vi.mocked(moderateReviewAndSync).mockResolvedValue({
      success: true,
      status: 'REJECTED',
      reason: 'updated',
      message: 'Отзыв отклонён.',
      syncWarnings: ['telegram_text:40'],
    });

    const request = new Request('http://localhost/api/admin/reviews/moderation-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': 'test-secret',
      },
      body: JSON.stringify({ reviewId: 'r1', status: 'REJECTED', correlationId: 'corr-1' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(moderateReviewAndSync).toHaveBeenCalledWith({
      reviewId: 'r1',
      status: 'REJECTED',
      channel: 'TELEGRAM',
      correlationId: 'corr-1',
    });
    expect(body).toEqual({
      success: true,
      status: 'REJECTED',
      reason: 'updated',
      message: 'Отзыв отклонён.',
      syncWarnings: ['telegram_text:40'],
    });
  });
});

afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.TELEGRAM_SERVICE_SECRET;
    return;
  }
  process.env.TELEGRAM_SERVICE_SECRET = originalSecret;
});
