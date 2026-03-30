import 'server-only';

import * as reviewService from '@/services/review.service';
import { syncReviewModerationMessages } from '@/lib/review-moderation-sync';

export type ReviewModerationTargetStatus = 'APPROVED' | 'REJECTED';

export type ReviewModerationActionReason =
  | 'updated'
  | 'already_moderated'
  | 'not_found'
  | 'unauthorized'
  | 'invalid'
  | 'error';

export interface ReviewModerationActionInput {
  reviewId: string;
  status: ReviewModerationTargetStatus;
  channel: 'TELEGRAM' | 'MAX' | 'INTERNAL_API';
}

export interface ReviewModerationActionResult {
  success: boolean;
  status?: ReviewModerationTargetStatus;
  reason: ReviewModerationActionReason;
  message: string;
}

function getSuccessMessage(status: ReviewModerationTargetStatus): string {
  return status === 'APPROVED' ? 'Отзыв размещён на сайте.' : 'Отзыв отклонён.';
}

export async function moderateReviewAndSync(
  input: ReviewModerationActionInput
): Promise<ReviewModerationActionResult> {
  const reviewId = input.reviewId.trim();

  if (!reviewId) {
    const result: ReviewModerationActionResult = {
      success: false,
      reason: 'invalid',
      message: 'Ошибка: неверные данные кнопки.',
    };
    console.warn('[review-moderation] invalid input', {
      channel: input.channel,
      reviewId: input.reviewId,
      targetStatus: input.status,
      reason: result.reason,
    });
    return result;
  }

  try {
    const review = await reviewService.findReviewById(reviewId);
    if (!review) {
      const result: ReviewModerationActionResult = {
        success: false,
        reason: 'not_found',
        message: 'Отзыв не найден.',
      };
      console.warn('[review-moderation] review not found', {
        channel: input.channel,
        reviewId,
        targetStatus: input.status,
        reason: result.reason,
      });
      return result;
    }

    if (review.status !== 'PENDING') {
      const result: ReviewModerationActionResult = {
        success: false,
        status: review.status === 'APPROVED' || review.status === 'REJECTED' ? review.status : undefined,
        reason: 'already_moderated',
        message: 'Отзыв уже промодерирован.',
      };
      console.info('[review-moderation] skipped already moderated review', {
        channel: input.channel,
        reviewId,
        targetStatus: input.status,
        currentStatus: review.status,
        reason: result.reason,
      });
      return result;
    }

    await reviewService.updateReview(reviewId, { status: input.status });
    await syncReviewModerationMessages({ reviewId, status: input.status });

    const result: ReviewModerationActionResult = {
      success: true,
      status: input.status,
      reason: 'updated',
      message: getSuccessMessage(input.status),
    };
    console.info('[review-moderation] review moderated', {
      channel: input.channel,
      reviewId,
      targetStatus: input.status,
      reason: result.reason,
    });
    return result;
  } catch (error) {
    const result: ReviewModerationActionResult = {
      success: false,
      reason: 'error',
      message: 'Ошибка. Попробуйте позже.',
    };
    console.error('[review-moderation] failed', {
      channel: input.channel,
      reviewId,
      targetStatus: input.status,
      reason: result.reason,
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }
}
