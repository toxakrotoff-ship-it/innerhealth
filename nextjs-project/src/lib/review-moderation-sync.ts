import { Bot } from '@maxhub/max-bot-api';
import * as settingsService from '@/services/settings.service';
import * as reviewService from '@/services/review.service';
import * as reviewModerationMessageService from '@/services/review-moderation-message.service';
import { getMaxBotConfig } from '@/lib/max/max-config';

interface SyncInput {
  reviewId: string;
  status: 'APPROVED' | 'REJECTED';
}

const EXTERNAL_SYNC_TIMEOUT_MS = 5_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = EXTERNAL_SYNC_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = EXTERNAL_SYNC_TIMEOUT_MS): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function syncTelegramReviewModeration(input: SyncInput): Promise<void> {
  const token = await settingsService.getTelegramBotToken();
  if (!token) return;
  const rows = await reviewModerationMessageService.listReviewModerationMessages(input.reviewId);
  const telegramRows = rows.filter((r) => r.channel === 'TELEGRAM');
  if (telegramRows.length === 0) return;

  const review = await reviewService.findReviewById(input.reviewId);
  if (!review) return;

  const TELEGRAM_API = 'https://api.telegram.org';
  const label = input.status === 'APPROVED' ? '✅ Отзыв размещён' : '❌ Отзыв отклонён';
  const textPreview = review.text.length > 300 ? review.text.slice(0, 297) + '…' : review.text;
  const messageText = [
    '📝 <b>Отзыв промодерирован</b>',
    `Статус: <b>${label}</b>`,
    `Автор: ${review.authorName}`,
    '',
    textPreview,
    '',
    `ID: <code>${review.id}</code>`,
  ].join('\n').slice(0, 4096);

  await Promise.all(
    telegramRows.map(async (row) => {
      const chatId = row.recipientId;
      const messageId = Number.parseInt(row.messageId, 10);
      if (!Number.isFinite(messageId)) return;
      const results = await Promise.allSettled([
        fetchWithTimeout(`${TELEGRAM_API}/bot${token}/editMessageReplyMarkup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
        }),
        fetchWithTimeout(`${TELEGRAM_API}/bot${token}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: messageText, parse_mode: 'HTML' }),
        }),
      ]);

      const replyMarkupResult = results[0];
      if (replyMarkupResult.status === 'rejected') {
        console.error('[review-moderation-sync] telegram reply markup update failed', {
          channel: 'TELEGRAM',
          reviewId: input.reviewId,
          targetStatus: input.status,
          recipientId: chatId,
          messageId: row.messageId,
          error: replyMarkupResult.reason instanceof Error ? replyMarkupResult.reason.message : String(replyMarkupResult.reason),
        });
      } else if (!replyMarkupResult.value.ok) {
        const errorBody = await replyMarkupResult.value.text().catch(() => '');
        console.error('[review-moderation-sync] telegram reply markup update not ok', {
          channel: 'TELEGRAM',
          reviewId: input.reviewId,
          targetStatus: input.status,
          recipientId: chatId,
          messageId: row.messageId,
          httpStatus: replyMarkupResult.value.status,
          body: errorBody.slice(0, 300),
        });
      }

      const textResult = results[1];
      if (textResult.status === 'rejected') {
        console.error('[review-moderation-sync] telegram text update failed', {
          channel: 'TELEGRAM',
          reviewId: input.reviewId,
          targetStatus: input.status,
          recipientId: chatId,
          messageId: row.messageId,
          error: textResult.reason instanceof Error ? textResult.reason.message : String(textResult.reason),
        });
      } else if (!textResult.value.ok) {
        const errorBody = await textResult.value.text().catch(() => '');
        console.error('[review-moderation-sync] telegram text update not ok', {
          channel: 'TELEGRAM',
          reviewId: input.reviewId,
          targetStatus: input.status,
          recipientId: chatId,
          messageId: row.messageId,
          httpStatus: textResult.value.status,
          body: errorBody.slice(0, 300),
        });
      }
    })
  );
}

async function syncMaxReviewModeration(input: SyncInput): Promise<void> {
  const config = await getMaxBotConfig();
  if (!config.token) return;
  const bot = new Bot(config.token);
  const rows = await reviewModerationMessageService.listReviewModerationMessages(input.reviewId);
  const maxRows = rows.filter((r) => r.channel === 'MAX');
  if (maxRows.length === 0) return;

  const review = await reviewService.findReviewById(input.reviewId);
  if (!review) return;

  const label = input.status === 'APPROVED' ? '✅ Отзыв размещён' : '❌ Отзыв отклонён';
  const textPreview = review.text.length > 300 ? review.text.slice(0, 297) + '…' : review.text;
  const messageText = [
    '📝 **Отзыв промодерирован**',
    `Статус: **${label}**`,
    `Автор: ${review.authorName}`,
    '',
    textPreview,
    '',
    `ID: \`${review.id}\``,
  ].join('\n');

  await Promise.all(
    maxRows.map(async (row) => {
      try {
        await withTimeout(
          bot.api.editMessage(row.messageId, {
            text: messageText,
            format: 'markdown',
            attachments: [],
          })
        );
      } catch (error) {
        console.error('[review-moderation-sync] max message update failed', {
          channel: 'MAX',
          reviewId: input.reviewId,
          targetStatus: input.status,
          recipientId: row.recipientId,
          messageId: row.messageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })
  );
}

export async function syncReviewModerationMessages(input: SyncInput): Promise<void> {
  await Promise.all([syncTelegramReviewModeration(input), syncMaxReviewModeration(input)]);
}
