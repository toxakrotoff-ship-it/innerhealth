import { Bot } from '@maxhub/max-bot-api';
import * as settingsService from '@/services/settings.service';
import * as reviewService from '@/services/review.service';
import * as reviewModerationMessageService from '@/services/review-moderation-message.service';
import { getMaxBotConfig } from '@/lib/max/max-config';

interface SyncInput {
  reviewId: string;
  status: 'APPROVED' | 'REJECTED';
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
      await fetch(`${TELEGRAM_API}/bot${token}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
      }).catch(() => {});
      await fetch(`${TELEGRAM_API}/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: messageText, parse_mode: 'HTML' }),
      }).catch(() => {});
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
      await bot.api
        .editMessage(row.messageId, {
          text: messageText,
          format: 'markdown',
          attachments: [],
        })
        .catch(() => {});
    })
  );
}

export async function syncReviewModerationMessages(input: SyncInput): Promise<void> {
  await Promise.all([syncTelegramReviewModeration(input), syncMaxReviewModeration(input)]);
}

