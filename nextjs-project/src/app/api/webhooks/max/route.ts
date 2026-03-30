import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { getMaxBotConfig } from '@/lib/max/max-config';
import { Bot } from '@maxhub/max-bot-api';
import { notifyMaxConnection } from '@/lib/max-notify';
import * as maxService from '@/services/max.service';
import * as reviewService from '@/services/review.service';
import { syncReviewModerationMessages } from '@/lib/review-moderation-sync';

const maxWebhookUpdateSchema = z.object({
  update_type: z.string(),
  chat_id: z.union([z.number(), z.string()]).optional(),
  payload: z.string().nullable().optional(),
  message: z
    .object({
      body: z
        .object({
          text: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
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
const MAX_MESSAGE_LENGTH = 500;

function buildHelpTextForMax(input: { isLinked: boolean }): string {
  if (!input.isLinked) {
    return [
      'Помощь',
      '',
      'Вы пока не подключены к уведомлениям.',
      '',
      'Как подключиться:',
      '1) Откройте сайт → профиль/настройки → «Подключить MAX»',
      '2) Перейдите по ссылке и нажмите Start',
      '',
      'Команды:',
      '• /status — проверить, подключены ли вы',
    ].join('\n');
  }
  return [
    'Помощь',
    '',
    'Вы подключены к уведомлениям.',
    '',
    'Команды:',
    '• /status — статус подключения',
    '• /promo — список промокодов (админам)',
    '• /stats — статистика по промокодам (партнёрам)',
  ].join('\n');
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

  if (parsed.data.update_type === 'message_created') {
    const text = String(parsed.data.message?.body?.text ?? '').trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return NextResponse.json({ ok: true });
    const maxUserId = parsed.data.user?.user_id !== undefined ? String(parsed.data.user.user_id) : '';
    if (!maxUserId) return NextResponse.json({ ok: true });

    if (text !== '/help') return NextResponse.json({ ok: true });

    const whitelist = await maxService.getMaxWhitelist();
    const isLinked = whitelist.some((row) => row.maxUserId === maxUserId);

    const bot = config.token ? new Bot(config.token) : null;
    if (!bot) return NextResponse.json({ ok: true });
    await bot.api
      .sendMessageToUser(Number.parseInt(maxUserId, 10), buildHelpTextForMax({ isLinked }), { format: 'markdown' })
      .catch(() => {});
    return NextResponse.json({ ok: true });
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
      void syncReviewModerationMessages({ reviewId, status });
      return NextResponse.json({ ok: true });
    }

    await makeNotification('Неизвестная кнопка.');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
