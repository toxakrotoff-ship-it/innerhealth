import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { getMaxBotConfig } from '@/lib/max/max-config';
import { Bot } from '@maxhub/max-bot-api';
import { notifyMaxConnection } from '@/lib/max-notify';
import * as maxService from '@/services/max.service';
import * as reviewService from '@/services/review.service';
import * as settingsService from '@/services/settings.service';
import * as reviewModerationMessageService from '@/services/review-moderation-message.service';

const maxWebhookUpdateSchema = z.object({
  update_type: z.string(),
  chat_id: z.union([z.number(), z.string()]).optional(),
  payload: z.string().nullable().optional(),
  user: z
    .object({
      user_id: z.union([z.number(), z.string()]),
    })
    .optional(),
  callback: z
    .object({
      callback_id: z.string(),
      payload: z.string().optional(),
      user: z.object({
        user_id: z.union([z.number(), z.string()]),
      }),
    })
    .optional(),
});

const VALID_CODE_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_START_CODE_LENGTH = 64;
const REVIEW_APPROVE_PREFIX = 'review_approve_';
const REVIEW_REJECT_PREFIX = 'review_reject_';

async function syncTelegramReviewModeration(
  reviewId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<void> {
  const token = await settingsService.getTelegramBotToken();
  if (!token) return;
  const rows = await reviewModerationMessageService.listReviewModerationMessages(reviewId);
  const telegramRows = rows.filter((r) => r.channel === 'TELEGRAM');
  if (telegramRows.length === 0) return;

  const TELEGRAM_API = 'https://api.telegram.org';
  const label = status === 'APPROVED' ? '✅ Отзыв размещён' : '❌ Отзыв отклонён';
  const review = await reviewService.findReviewById(reviewId);
  if (!review) return;
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

async function syncMaxReviewModeration(
  bot: Bot | null,
  reviewId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<void> {
  if (!bot) return;
  const rows = await reviewModerationMessageService.listReviewModerationMessages(reviewId);
  const maxRows = rows.filter((r) => r.channel === 'MAX');
  if (maxRows.length === 0) return;
  const label = status === 'APPROVED' ? '✅ Отзыв размещён' : '❌ Отзыв отклонён';
  const review = await reviewService.findReviewById(reviewId);
  if (!review) return;
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

function isSecureRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const proto = request.headers.get('x-forwarded-proto');
  return proto === 'https';
}

export async function POST(request: Request) {
  if (!isSecureRequest(request))
    return NextResponse.json({ error: 'HTTPS required' }, { status: 403 });

  const identifier = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(identifier, 'webhook:max', 30, 60_000);
  if (!rateLimit.success)
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const config = await getMaxBotConfig();
  const webhookSecret = config.webhookSecret;
  if (webhookSecret) {
    // MAX sends this header when `secret` is set on subscription.
    // Docs name: X-Max-Bot-Api-Secret
    const requestSecret = request.headers.get('x-max-bot-api-secret')?.trim();
    if (!requestSecret || requestSecret !== webhookSecret)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = maxWebhookUpdateSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  if (parsed.data.update_type === 'bot_started') {
    const codeRaw = parsed.data.payload ?? '';
    const safeCode = codeRaw.slice(0, MAX_START_CODE_LENGTH);
    const maxUserId = parsed.data.user?.user_id !== undefined ? String(parsed.data.user.user_id) : '';
    if (safeCode && VALID_CODE_REGEX.test(safeCode) && maxUserId) {
      const userId = await maxService.confirmMaxLinkAndReturnUserId(safeCode, maxUserId);
      if (userId) void notifyMaxConnection({ userId, maxUserId });
    }
  }

  if (parsed.data.update_type === 'message_callback' && parsed.data.callback) {
    const callbackId = parsed.data.callback.callback_id;
    const payloadValue = (parsed.data.callback.payload ?? '').trim();
    const maxUserId = String(parsed.data.callback.user.user_id);

    const whitelist = await maxService.getMaxWhitelist();
    const isAllowed = whitelist.some((row) => row.maxUserId === maxUserId);

    const bot = config.token ? new Bot(config.token) : null;
    if (!isAllowed) {
      if (bot) await bot.api.answerOnCallback(callbackId, { notification: 'Доступ только для администраторов.' }).catch(() => {});
      return NextResponse.json({ ok: true });
    }

    const makeNotification = async (text: string) => {
      if (!bot) return;
      await bot.api.answerOnCallback(callbackId, { notification: text.slice(0, 200) }).catch(() => {});
    };

    if (payloadValue.startsWith(REVIEW_APPROVE_PREFIX) || payloadValue.startsWith(REVIEW_REJECT_PREFIX)) {
      const status = payloadValue.startsWith(REVIEW_APPROVE_PREFIX) ? 'APPROVED' : 'REJECTED';
      const reviewId = payloadValue
        .slice(payloadValue.startsWith(REVIEW_APPROVE_PREFIX) ? REVIEW_APPROVE_PREFIX.length : REVIEW_REJECT_PREFIX.length)
        .trim();
      if (!reviewId) {
        await makeNotification('Ошибка: неверные данные кнопки.');
        return NextResponse.json({ ok: true });
      }
      const review = await reviewService.findReviewById(reviewId);
      if (!review) {
        await makeNotification('Отзыв не найден.');
        return NextResponse.json({ ok: true });
      }
      if (review.status !== 'PENDING') {
        await makeNotification('Отзыв уже промодерирован.');
        return NextResponse.json({ ok: true });
      }
      await reviewService.updateReview(reviewId, { status });
      await makeNotification(status === 'APPROVED' ? 'Отзыв размещён на сайте.' : 'Отзыв отклонён.');
      void syncMaxReviewModeration(bot, reviewId, status);
      void syncTelegramReviewModeration(reviewId, status);
      return NextResponse.json({ ok: true });
    }

    await makeNotification('Неизвестная кнопка.');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
