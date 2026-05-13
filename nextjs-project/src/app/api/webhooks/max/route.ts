import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Bot } from '@maxhub/max-bot-api';
import {
  getMaxBotUserCapabilities,
  type BotUserCapabilities,
} from '@/bot/runtime/capabilities';
import { getMaxBotConfig } from '@/bot/runtime/max-config';
import { getPromoStatsForAdmin } from '@/bot/runtime/promo-stats';
import { getPartnerStatsByMaxUserId } from '@/bot/runtime/partner-stats';
import { confirmMaxLinkAndReturnUserId } from '@/bot/runtime/max-links';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { notifyMaxConnection } from '@/lib/max-notify';
import { moderateReviewAndSync } from '@/lib/review-moderation-action';
import { normalizeBrandId, type BrandId } from '@/lib/brand/brand';
import { createCdekShipmentForOrder } from '@/lib/cdek-shipment-action';
import {
  buildHelpTextForMax,
  buildMaxMenuAttachments,
  buildUnknownCommandTextForMax,
  buildWelcomeTextForMax,
  resolveMaxMenuCommand,
  type MaxMenuCommand,
} from '@/lib/max-bot-menu';
import {
  MAX_LINK_CODE_MAX_LENGTH,
  MAX_LINK_CODE_REGEX,
  parseSimpleMaxSlashCommand,
  parseSlashStart,
  isSlashHelp,
} from '@/lib/max-message-slash';

const maxWebhookUpdateSchema = z.object({
  update_type: z.string(),
  chat_id: z.union([z.number(), z.string()]).optional(),
  /** Код deep link; у MAX также встречается start_payload / startPayload */
  payload: z.string().nullable().optional(),
  start_payload: z.string().nullable().optional(),
  startPayload: z.string().nullable().optional(),
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

function extractBotStartedLinkCode(update: z.infer<typeof maxWebhookUpdateSchema>): string {
  const candidates = [update.payload, update.start_payload, update.startPayload];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate.trim().slice(0, MAX_LINK_CODE_MAX_LENGTH);
    }
  }
  return '';
}

const REVIEW_APPROVE_PREFIX = 'review_approve_';
const REVIEW_REJECT_PREFIX = 'review_reject_';
const CDEK_CREATE_PREFIX = 'cdek_create_';
const MAX_MESSAGE_LENGTH = 500;

function isSecureRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const proto = request.headers.get('x-forwarded-proto');
  return proto === 'https';
}

async function sendMaxMessageWithMenu(
  bot: Bot,
  maxUserId: string,
  text: string,
  format: 'markdown' | 'html' = 'markdown',
  brandId: BrandId = 'inner'
): Promise<void> {
  const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId });
  await bot.api
    .sendMessageToUser(Number.parseInt(maxUserId, 10), text, {
      format,
      attachments: buildMaxMenuAttachments(capabilities) as unknown as never,
    })
    .catch(() => {});
}

async function buildMaxCommandResponse(
  maxUserId: string,
  command: MaxMenuCommand,
  brandId: BrandId
): Promise<{ text: string; format: 'markdown' | 'html' }> {
  const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId });

  if (command === 'help') {
    return { text: buildHelpTextForMax(capabilities), format: 'markdown' };
  }
  if (command === 'status') {
    return {
      text: capabilities.isLinked
        ? '✅ Вы подключены к уведомлениям.'
        : '❌ Вы не подключены. Получите ссылку в админке/личном кабинете.',
      format: 'markdown',
    };
  }
  if (command === 'promo') {
    if (!capabilities.isAdmin) {
      return { text: 'Доступ только для администраторов.', format: 'markdown' };
    }
    const promos = await getPromoStatsForAdmin(brandId);
    if (promos.length === 0) return { text: 'Нет промокодов.', format: 'markdown' };
    const lines = promos.map((promo) => {
      const limit = promo.usageLimit != null ? ` / ${promo.usageLimit}` : '';
      const status = promo.isActive ? '✅' : '❌';
      return `${status} ${promo.code} — использований: ${Number(promo.usedCount) || 0}${limit}`;
    });
    return { text: `<b>Промокоды</b>\n\n${lines.join('\n')}`, format: 'html' };
  }

  if (!capabilities.isPartner) {
    return { text: 'Доступ только для партнёров.', format: 'markdown' };
  }

  const stats = await getPartnerStatsByMaxUserId(maxUserId, brandId);
  if (stats === null) {
    return {
      text: '❌ Вы не подключены. Получите ссылку в админке/личном кабинете.',
      format: 'markdown',
    };
  }
  if (stats.length === 0) {
    return { text: 'У вас пока нет статистики.', format: 'markdown' };
  }
  const totalOrders = stats.reduce((sum, row) => sum + row.ordersCount, 0);
  const lines = stats.map((row) =>
    `• ${row.code} — заказов: ${row.ordersCount}`
  );
  return {
    text: `<b>Ваша статистика</b>\n\nВсего заказов: <b>${totalOrders}</b>\n\n${lines.join('\n')}`,
    format: 'html',
  };
}

export async function POST(request: Request) {
  if (!isSecureRequest(request)) {
    return NextResponse.json({ error: 'HTTPS required' }, { status: 403 });
  }

  const identifier = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(identifier, 'webhook:max', 30, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const brandId = normalizeBrandId(new URL(request.url).searchParams.get('brand')) ?? 'inner';
  const config = await getMaxBotConfig({ brandId });
  const webhookSecret = config.webhookSecret;
  if (webhookSecret) {
    const requestSecret = request.headers.get('x-max-bot-api-secret')?.trim();
    if (!requestSecret || requestSecret !== webhookSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const payload = await request.json().catch(() => null);
  const parsed = maxWebhookUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (parsed.data.update_type === 'bot_started') {
    const safeCode = extractBotStartedLinkCode(parsed.data);
    const maxUserId = parsed.data.user?.user_id !== undefined ? String(parsed.data.user.user_id) : '';
    if (safeCode && MAX_LINK_CODE_REGEX.test(safeCode) && maxUserId) {
      const result = await confirmMaxLinkAndReturnUserId(safeCode, maxUserId);
      if (result) {
        void notifyMaxConnection({ userId: result.userId, maxUserId, brandId: result.brandId });
        const bot = config.token ? new Bot(config.token) : null;
        if (bot) {
          const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId: result.brandId });
          await bot.api
            .sendMessageToUser(Number.parseInt(maxUserId, 10), buildWelcomeTextForMax(capabilities), {
              format: 'markdown',
              attachments: buildMaxMenuAttachments(capabilities) as unknown as never,
            })
            .catch(() => {});
        }
      } else if (config.token && maxUserId) {
        const bot = new Bot(config.token);
        await bot.api
          .sendMessageToUser(
            Number.parseInt(maxUserId, 10),
            'Не удалось привязать: код неверный или истёк. Создайте новую ссылку в админке / личном кабинете.',
            { format: 'markdown' }
          )
          .catch(() => {});
      }
    }
  }

  if (parsed.data.update_type === 'message_created') {
    const text = String(parsed.data.message?.body?.text ?? '').trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return NextResponse.json({ ok: true });

    const maxUserId = parsed.data.user?.user_id !== undefined ? String(parsed.data.user.user_id) : '';
    if (!maxUserId) return NextResponse.json({ ok: true });

    const bot = config.token ? new Bot(config.token) : null;
    if (!bot) return NextResponse.json({ ok: true });

    if (isSlashHelp(text)) {
      const response = await buildMaxCommandResponse(maxUserId, 'help', brandId);
      await sendMaxMessageWithMenu(bot, maxUserId, response.text, response.format, brandId);
      return NextResponse.json({ ok: true });
    }

    const startParts = parseSlashStart(text);
    if (startParts) {
      if (startParts.code) {
        const safeCode = startParts.code;
        if (!MAX_LINK_CODE_REGEX.test(safeCode)) {
          await sendMaxMessageWithMenu(
            bot,
            maxUserId,
            'Неверный формат кода. Используйте ссылку из личного кабинета.',
            'markdown',
            brandId
          );
          return NextResponse.json({ ok: true });
        }
        const result = await confirmMaxLinkAndReturnUserId(safeCode, maxUserId);
        if (result) {
          void notifyMaxConnection({ userId: result.userId, maxUserId, brandId: result.brandId });
          const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId: result.brandId });
          await bot.api
            .sendMessageToUser(Number.parseInt(maxUserId, 10), buildWelcomeTextForMax(capabilities), {
              format: 'markdown',
              attachments: buildMaxMenuAttachments(capabilities) as unknown as never,
            })
            .catch(() => {});
        } else {
          await sendMaxMessageWithMenu(
            bot,
            maxUserId,
            'Не удалось привязать: код неверный или истёк. Создайте новую ссылку в админке.',
            'markdown',
            brandId
          );
        }
        return NextResponse.json({ ok: true });
      }
      const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId });
      await sendMaxMessageWithMenu(
        bot,
        maxUserId,
        'Чтобы подключить уведомления, откройте **ссылку из личного кабинета** (кнопка «Подключить MAX»). Просто /start без этой ссылки не привязывает аккаунт.',
        'markdown',
        brandId
      );
      return NextResponse.json({ ok: true });
    }

    const simpleCmd = parseSimpleMaxSlashCommand(text);
    if (simpleCmd) {
      const response = await buildMaxCommandResponse(maxUserId, simpleCmd, brandId);
      await sendMaxMessageWithMenu(bot, maxUserId, response.text, response.format, brandId);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/')) {
      return NextResponse.json({ ok: true });
    }

    const capabilities: BotUserCapabilities = await getMaxBotUserCapabilities(maxUserId, { brandId });
    await sendMaxMessageWithMenu(bot, maxUserId, buildUnknownCommandTextForMax(capabilities), 'markdown', brandId);
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.update_type === 'message_callback' && parsed.data.callback) {
    const callbackId = parsed.data.callback.callback_id;
    const payloadValue = (parsed.data.callback.payload ?? '').trim();
    const maxUserId = String(parsed.data.callback.user.user_id);
    const bot = config.token ? new Bot(config.token) : null;

    const makeNotification = async (text: string) => {
      if (!bot) return;
      await bot.api.answerOnCallback(callbackId, { notification: text.slice(0, 200) }).catch(() => {});
    };

    const menuCommand = resolveMaxMenuCommand(payloadValue);
    if (menuCommand) {
      const response = await buildMaxCommandResponse(maxUserId, menuCommand, brandId);
      await makeNotification(response.text.replace(/<[^>]+>/g, ''));
      if (bot) {
        await sendMaxMessageWithMenu(bot, maxUserId, response.text, response.format, brandId);
      }
      return NextResponse.json({ ok: true });
    }

    if (payloadValue.startsWith(REVIEW_APPROVE_PREFIX) || payloadValue.startsWith(REVIEW_REJECT_PREFIX)) {
      const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId });
      if (!capabilities.isAdmin) {
        await makeNotification('Доступ только для администраторов.');
        return NextResponse.json({ ok: true });
      }
      const status = payloadValue.startsWith(REVIEW_APPROVE_PREFIX) ? 'APPROVED' : 'REJECTED';
      const reviewId = payloadValue
        .slice(
          payloadValue.startsWith(REVIEW_APPROVE_PREFIX)
            ? REVIEW_APPROVE_PREFIX.length
            : REVIEW_REJECT_PREFIX.length
        )
        .trim();
      if (!reviewId) {
        await makeNotification('Ошибка: неверные данные кнопки.');
        return NextResponse.json({ ok: true });
      }
      const result = await moderateReviewAndSync({ reviewId, status, channel: 'MAX' });
      await makeNotification(result.message);
      return NextResponse.json({ ok: true });
    }

    if (payloadValue.startsWith(CDEK_CREATE_PREFIX)) {
      const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId });
      if (!capabilities.isAdmin) {
        await makeNotification('Доступ только для администраторов.');
        return NextResponse.json({ ok: true });
      }
      const orderId = payloadValue.slice(CDEK_CREATE_PREFIX.length).trim();
      if (!orderId) {
        await makeNotification('Ошибка: неверный ID заказа.');
        return NextResponse.json({ ok: true });
      }
      const result = await createCdekShipmentForOrder(orderId);
      await makeNotification(
        'error' in result
          ? result.error
          : result.message ?? `Отгрузка СДЭК создана: ${result.uuid}`
      );
      return NextResponse.json({ ok: true });
    }

    await makeNotification('Неизвестная кнопка.');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
