import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/services/review.service', () => ({
  findReviewById: vi.fn(),
  updateReview: vi.fn(),
}));
vi.mock('@/lib/review-moderation-sync', () => ({
  syncReviewModerationMessages: vi.fn(),
}));

import * as reviewService from '@/services/review.service';
import { syncReviewModerationMessages } from '@/lib/review-moderation-sync';
import { moderateReviewAndSync } from '@/lib/review-moderation-action';

describe('moderateReviewAndSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates pending review and syncs both channels', async () => {
    vi.mocked(reviewService.findReviewById).mockResolvedValue({
      id: 'r1',
      status: 'PENDING',
      authorName: 'Test',
      text: 'Review',
    } as Awaited<ReturnType<typeof reviewService.findReviewById>>);
    vi.mocked(reviewService.updateReview).mockResolvedValue({ id: 'r1' } as never);
    vi.mocked(syncReviewModerationMessages).mockResolvedValue(undefined);

    const result = await moderateReviewAndSync({
      reviewId: 'r1',
      status: 'REJECTED',
      channel: 'TELEGRAM',
    });

    expect(result).toEqual({
      success: true,
      status: 'REJECTED',
      reason: 'updated',
      message: 'Отзыв отклонён.',
    });
    expect(reviewService.updateReview).toHaveBeenCalledWith('r1', { status: 'REJECTED' });
    expect(syncReviewModerationMessages).toHaveBeenCalledWith({ reviewId: 'r1', status: 'REJECTED' });
  });

  it('returns already moderated for non-pending review', async () => {
    vi.mocked(reviewService.findReviewById).mockResolvedValue({
      id: 'r1',
      status: 'APPROVED',
      authorName: 'Test',
      text: 'Review',
    } as Awaited<ReturnType<typeof reviewService.findReviewById>>);

    const result = await moderateReviewAndSync({
      reviewId: 'r1',
      status: 'REJECTED',
      channel: 'MAX',
    });

    expect(result).toEqual({
      success: false,
      status: 'APPROVED',
      reason: 'already_moderated',
      message: 'Отзыв уже промодерирован.',
    });
    expect(reviewService.updateReview).not.toHaveBeenCalled();
    expect(syncReviewModerationMessages).not.toHaveBeenCalled();
  });

  it('returns not found when review does not exist', async () => {
    vi.mocked(reviewService.findReviewById).mockResolvedValue(null);

    const result = await moderateReviewAndSync({
      reviewId: 'missing',
      status: 'APPROVED',
      channel: 'MAX',
    });

    expect(result).toEqual({
      success: false,
      reason: 'not_found',
      message: 'Отзыв не найден.',
    });
    expect(reviewService.updateReview).not.toHaveBeenCalled();
    expect(syncReviewModerationMessages).not.toHaveBeenCalled();
  });
});
