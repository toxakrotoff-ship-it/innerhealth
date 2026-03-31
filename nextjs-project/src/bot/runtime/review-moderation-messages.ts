import { prisma } from '@/lib/prisma';

export type ReviewModerationChannel = 'TELEGRAM' | 'MAX';

export interface UpsertReviewModerationMessageInput {
  reviewId: string;
  channel: ReviewModerationChannel;
  recipientId: string;
  messageId: string;
}

export async function upsertReviewModerationMessage(
  input: UpsertReviewModerationMessageInput
): Promise<void> {
  await prisma.reviewModerationMessage.upsert({
    where: {
      reviewId_channel_recipientId: {
        reviewId: input.reviewId,
        channel: input.channel,
        recipientId: input.recipientId,
      },
    },
    update: { messageId: input.messageId },
    create: {
      reviewId: input.reviewId,
      channel: input.channel,
      recipientId: input.recipientId,
      messageId: input.messageId,
    },
  });
}

export async function listReviewModerationMessages(reviewId: string): Promise<
  Array<{
    channel: string;
    recipientId: string;
    messageId: string;
  }>
> {
  return prisma.reviewModerationMessage.findMany({
    where: { reviewId },
    select: { channel: true, recipientId: true, messageId: true },
  });
}
