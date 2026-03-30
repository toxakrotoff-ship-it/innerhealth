import { Bot, Keyboard } from '@maxhub/max-bot-api';
import * as maxService from '@/services/max.service';
import * as settingsService from '@/services/settings.service';
import * as userService from '@/services/user.service';
import * as reviewModerationMessageService from '@/services/review-moderation-message.service';
import type { BrandId } from '@/lib/brand/brand';

interface MaxAttachmentRequest {
  type: string;
  payload: unknown;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function getMaxBot(options?: { brandId?: BrandId | null }): Promise<Bot | null> {
  const settings = await settingsService.getMaxBotSettings(options);
  if (!settings.token) return null;
  return new Bot(settings.token);
}

async function sendToUsers(
  userIds: string[],
  text: string,
  options?: { brandId?: BrandId | null; attachments?: MaxAttachmentRequest[]; reviewId?: string }
): Promise<void> {
  const bot = await getMaxBot(options);
  if (!bot || userIds.length === 0) return;
  for (const userId of userIds) {
    const id = Number.parseInt(userId, 10);
    if (!Number.isFinite(id)) continue;
    const message = await bot.api
      .sendMessageToUser(id, text, {
        format: 'markdown',
        attachments: options?.attachments as unknown as never,
      })
      .catch((error) => {
      console.error('[max-notify] sendMessageToUser failed', userId, error);
      return null;
    });
    if (message && typeof message === 'object') {
      const anyMessage = message as unknown as Record<string, unknown>;
      const body = anyMessage.body as Record<string, unknown> | undefined;
      const nestedMessage = anyMessage.message as Record<string, unknown> | undefined;
      const nestedBody = (nestedMessage?.body as Record<string, unknown> | undefined) ?? undefined;
      const midCandidate =
        (body?.mid ?? nestedBody?.mid ?? anyMessage.mid ?? (nestedMessage as unknown as { mid?: unknown } | undefined)?.mid) ??
        '';
      const mid = typeof midCandidate === 'string' ? midCandidate : String(midCandidate);
      if (mid) {
        if (options?.reviewId) {
          await reviewModerationMessageService
            .upsertReviewModerationMessage({
              reviewId: options.reviewId,
              channel: 'MAX',
              recipientId: userId,
              messageId: mid,
            })
            .catch((error) => {
              console.error('[max-notify] failed to store moderation message id', {
                channel: 'MAX',
                reviewId: options.reviewId,
                recipientId: userId,
                messageId: mid,
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }
      }
    }
  }
}

export interface MaxOrderNotifyPayload {
  orderId: string;
  total: number;
  items: Array<{ title: string; quantity: number; price: number }>;
  shipping: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    zipCode: string;
    country: string;
  };
  promoCode?: string | null;
  promoCodeId?: string | null;
  customerUserId?: string | null;
  brandId?: BrandId;
}

export async function notifyMaxOrder(payload: MaxOrderNotifyPayload): Promise<void> {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  const whitelist = await maxService.getMaxWhitelist();
  const adminUserIds = whitelist.map((row) => row.maxUserId);
  const lines: string[] = [
    '**Новый заказ**',
    `ID: ${escapeHtml(payload.orderId)}`,
    '',
    '**Состав:**',
    ...payload.items.map(
      (item) =>
        `• ${escapeHtml(item.title)} — ${item.quantity} × ${item.price.toFixed(0)} ₽ = ${(item.quantity * item.price).toFixed(0)} ₽`
    ),
    '',
    `Итого: **${payload.total.toFixed(0)} ₽**`,
    payload.promoCode ? `Промокод: ${escapeHtml(payload.promoCode)}` : '',
    '',
    '**Доставка:**',
    `ФИО: ${escapeHtml(payload.shipping.fullName)}`,
    `Телефон: ${escapeHtml(payload.shipping.phone)}`,
    `Email: ${escapeHtml(payload.shipping.email)}`,
    `Адрес: ${escapeHtml(payload.shipping.address)}`,
    `Город: ${escapeHtml(payload.shipping.city)}, ${escapeHtml(payload.shipping.zipCode)}, ${escapeHtml(payload.shipping.country)}`,
  ];
  await sendToUsers(adminUserIds, lines.filter(Boolean).join('\n'), scope);

  if (payload.promoCodeId) {
    const partnerMaxUserId = await maxService.getPartnerMaxUserIdByPromoCodeId(payload.promoCodeId);
    if (partnerMaxUserId) {
      const promoLabel = payload.promoCode ? escapeHtml(payload.promoCode) : 'промокод';
      const partnerText =
        `💰 **Заказ по вашему промокоду**\n\n` +
        `Промокод: ${promoLabel}\n` +
        `Заказ ID: ${escapeHtml(payload.orderId)}\n` +
        `Сумма: **${payload.total.toFixed(0)} ₽**`;
      await sendToUsers([partnerMaxUserId], partnerText, scope);
    }
  }

  if (payload.customerUserId) {
    const customerLink = await maxService.findMaxWhitelistByUserId(payload.customerUserId);
    if (customerLink) {
      const customerText =
        `✅ **Ваш заказ принят**\n\n` +
        `Номер: ${escapeHtml(payload.orderId)}\n` +
        `Сумма: **${payload.total.toFixed(0)} ₽**`;
      await sendToUsers([customerLink.maxUserId], customerText, scope);
    }
  }
}

export async function notifyMaxOrderStatusForUser(payload: {
  userId: string;
  orderId: string;
  status: 'paid' | 'canceled';
  brandId?: BrandId;
}): Promise<void> {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  const link = await maxService.findMaxWhitelistByUserId(payload.userId);
  if (!link?.maxUserId) return;

  const statusLine = payload.status === 'paid' ? '✅ **Заказ оплачен**' : '❌ **Платёж отменён**';
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    '';
  const orderUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/account/orders/${encodeURIComponent(payload.orderId)}` : '';
  const lines = [
    statusLine,
    `ID: \`${escapeHtml(payload.orderId)}\``,
    orderUrl ? `Открыть заказ: ${escapeHtml(orderUrl)}` : '',
  ].filter(Boolean);
  await sendToUsers([link.maxUserId], lines.join('\n'), scope);
}

export async function notifyMaxCdekTrackForUser(payload: {
  userId: string;
  orderId: string;
  trackNumber: string;
  brandId?: BrandId;
}): Promise<void> {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  const link = await maxService.findMaxWhitelistByUserId(payload.userId);
  if (!link?.maxUserId) return;

  const track = payload.trackNumber.trim();
  if (!track) return;
  const trackUrl = `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(track)}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    '';
  const orderUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/account/orders/${encodeURIComponent(payload.orderId)}` : '';
  const lines = [
    '📦 **CDEK: трек-номер сформирован**',
    `Заказ: \`${escapeHtml(payload.orderId)}\``,
    `Трек: \`${escapeHtml(track)}\``,
    `Отследить: ${escapeHtml(trackUrl)}`,
    orderUrl ? `Открыть заказ: ${escapeHtml(orderUrl)}` : '',
  ].filter(Boolean);
  await sendToUsers([link.maxUserId], lines.join('\n'), scope);
}

export async function notifyMaxForm(payload: {
  formName: string;
  fields: Record<string, string>;
}): Promise<void> {
  const whitelist = await maxService.getMaxWhitelist();
  const lines: string[] = [
    '**Новая заявка с сайта**',
    `Форма: ${escapeHtml(payload.formName)}`,
    '',
    ...Object.entries(payload.fields).map(
      ([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value || '—')}`
    ),
  ];
  await sendToUsers(whitelist.map((row) => row.maxUserId), lines.join('\n'));
}

export async function notifyMaxConnection(payload: {
  userId: string;
  maxUserId: string;
}): Promise<void> {
  const whitelist = await maxService.getMaxWhitelist();
  const user = await userService.findUserProfile(payload.userId);
  const label = user
    ? [user.name, user.lastName].filter(Boolean).join(' ') || user.email
    : payload.userId;
  const text =
    '🔗 **Подключение MAX**\n\n' +
    `Пользователь ${escapeHtml(label)} привязал уведомления (MAX user ID: \`${escapeHtml(payload.maxUserId)}\`).`;
  await sendToUsers(whitelist.map((row) => row.maxUserId), text);
}

export async function notifyMaxInfraAlert(payload: {
  kind: 'disk' | 'memory' | 'cpu' | 'container' | 'custom';
  severity: 'info' | 'warn' | 'critical';
  message: string;
}): Promise<void> {
  const severityLabel =
    payload.severity === 'critical' ? 'CRITICAL' : payload.severity === 'warn' ? 'WARN' : 'INFO';
  const lines: string[] = [
    '🛠️ **Infra alert**',
    `Severity: **${escapeHtml(severityLabel)}**`,
    `Kind: \`${escapeHtml(payload.kind)}\``,
    '',
    escapeHtml(payload.message),
  ];
  const recipients = await userService.getInfraAlertMaxUserIds();
  await sendToUsers(recipients, lines.join('\n'));
}

export async function notifyMaxPaymentError(payload: {
  orderId: string;
  total?: number;
  errorMessage: string;
  context: 'create' | 'webhook';
  brandId?: BrandId;
}): Promise<void> {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  const contextLabel = payload.context === 'create' ? 'создание платежа' : 'верификация в webhook';
  const totalLine =
    payload.total !== undefined ? `Сумма: ${payload.total.toFixed(0)} ₽. ` : '';
  const text = [
    '⚠️ **Ошибка ЮKassa**',
    `Не удалось связаться с платёжной системой (${escapeHtml(contextLabel)}).`,
    '',
    `Заказ: ${escapeHtml(payload.orderId)}. ${totalLine}Ошибка: ${escapeHtml(payload.errorMessage.slice(0, 300))}`,
  ].join('\n');
  const whitelist = await maxService.getMaxWhitelist();
  await sendToUsers(whitelist.map((row) => row.maxUserId), text, scope);
}

export async function notifyMaxNewReview(payload: {
  reviewId: string;
  authorName: string;
  text: string;
  brandId?: BrandId;
}): Promise<void> {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  const whitelist = await maxService.getMaxWhitelist();
  if (whitelist.length === 0) return;
  const textPreview = payload.text.length > 300 ? `${payload.text.slice(0, 297)}...` : payload.text;
  const callbackPrefix = 'review_';
  const approvePayload = `${callbackPrefix}approve_${payload.reviewId}`.slice(0, 256);
  const rejectPayload = `${callbackPrefix}reject_${payload.reviewId}`.slice(0, 256);
  const messageText = [
    '📝 **Новый отзыв (на модерации)**',
    `Автор: ${escapeHtml(payload.authorName)}`,
    '',
    escapeHtml(textPreview),
    '',
    `ID: \`${escapeHtml(payload.reviewId)}\``,
    'Модерация: кнопками ниже или в админке.',
  ].join('\n');
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    '';
  const adminUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/admin/reviews` : '/admin/reviews';
  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('✅ Разместить', approvePayload),
      Keyboard.button.callback('❌ Отклонить', rejectPayload),
    ],
    [Keyboard.button.link('🔎 Открыть в админке', adminUrl)],
  ]);
  await sendToUsers(
    whitelist.map((row) => row.maxUserId),
    messageText,
    { ...scope, attachments: [keyboard], reviewId: payload.reviewId }
  );
}
