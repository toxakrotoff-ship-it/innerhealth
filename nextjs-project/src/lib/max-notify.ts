import { Bot, Keyboard } from '@maxhub/max-bot-api';
import * as maxService from '@/services/max.service';
import * as settingsService from '@/services/settings.service';
import * as userService from '@/services/user.service';
import * as reviewModerationMessageService from '@/services/review-moderation-message.service';
import type { BrandId } from '@/lib/brand/brand';
import { normalizeBrandId, resolveBrandByHost } from '@/lib/brand/brand';
import { getBrandSiteUrl } from '@/lib/brand/site-branding';
import { formatOrderLabel } from '@/lib/order-label';
import { maxNotificationSiteHeader } from '@/lib/max-notification-site';

interface MaxAttachmentRequest {
  type: string;
  payload: unknown;
}

function deliveryBrands(sourceBrandId?: BrandId): BrandId[] {
  return sourceBrandId === 'sprint-power' ? ['sprint-power', 'inner'] : ['inner'];
}

async function sendToAdmins(
  sourceBrandId: BrandId | undefined,
  text: string,
  options?: { attachments?: MaxAttachmentRequest[]; reviewId?: string }
): Promise<void> {
  for (const brandId of deliveryBrands(sourceBrandId)) {
    const adminUserIds = await userService.getAdminMaxUserIds(brandId);
    await sendToUsers(adminUserIds, text, {
      brandId,
      sourceBrandId: sourceBrandId ?? 'inner',
      ...options,
      reviewChannel: options?.reviewId && brandId === 'inner' && sourceBrandId === 'sprint-power'
        ? 'MAX_INNER'
        : 'MAX',
    });
  }
}

async function sendToLinkedUser(
  userId: string,
  sourceBrandId: BrandId | undefined,
  text: string
): Promise<void> {
  for (const brandId of deliveryBrands(sourceBrandId)) {
    const link = await maxService.findMaxWhitelistByUserId(userId, { brandId });
    if (!link?.maxUserId) continue;
    const adminUserIds = await userService.getAdminMaxUserIds(brandId);
    if (adminUserIds.includes(link.maxUserId)) continue;
    await sendToUsers([link.maxUserId], text, { brandId, sourceBrandId: sourceBrandId ?? 'inner' });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function siteUrl(brandId?: BrandId): string {
  return getBrandSiteUrl(brandId ?? 'inner').replace(/\/$/, '');
}

async function getMaxBot(options?: { brandId?: BrandId | null }): Promise<Bot | null> {
  const settings = await settingsService.getMaxBotSettings({ brandId: options?.brandId });
  if (!settings.token) return null;
  return new Bot(settings.token);
}

async function sendToUsers(
  userIds: string[],
  text: string,
  options?: {
    brandId?: BrandId | null;
    sourceBrandId?: BrandId;
    attachments?: MaxAttachmentRequest[];
    reviewId?: string;
    reviewChannel?: 'MAX' | 'MAX_INNER';
    header?: string;
  }
): Promise<number> {
  if (userIds.length === 0) {
    console.warn('[max-notify] no recipients', { brandId: options?.brandId ?? null });
    return 0;
  }

  const bot = await getMaxBot(options);
  if (!bot) {
    console.warn('[max-notify] bot token is missing', { brandId: options?.brandId ?? null });
    return 0;
  }

  let deliveredCount = 0;
  for (const userId of userIds) {
    const id = Number.parseInt(userId, 10);
    if (!Number.isFinite(id)) {
      console.warn('[max-notify] invalid recipient id', { userId, brandId: options?.brandId ?? null });
      continue;
    }
    const message = await bot.api
      .sendMessageToUser(id, `${options?.header ?? maxNotificationSiteHeader(options?.sourceBrandId ?? options?.brandId ?? 'inner')}\n\n${text}`, {
        format: 'markdown',
        attachments: options?.attachments as unknown as never,
      })
      .catch((error) => {
      console.error('[max-notify] sendMessageToUser failed', userId, error);
      return null;
    });
    if (!message) continue;
    deliveredCount += 1;
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
              channel: options.reviewChannel ?? 'MAX',
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
  return deliveredCount;
}

export interface MaxOrderNotifyPayload {
  orderId: string;
  orderNumber?: number | null;
  total: number;
  shippingCost: number;
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
  promoDiscountAmount?: number | null;
  promoCodeId?: string | null;
  customerUserId?: string | null;
  brandId?: BrandId;
  deliveryMethod?: string | null;
  cdekOrderUuid?: string | null;
  cdekOrderError?: string | null;
}

export async function notifyMaxOrder(payload: MaxOrderNotifyPayload): Promise<void> {
  const orderLabel = escapeHtml(formatOrderLabel(payload));
  const isCdek =
    payload.deliveryMethod === 'cdek_pvz' || payload.deliveryMethod === 'cdek_door';
  const cdekLines: string[] = [];
  if (isCdek) {
    cdekLines.push(
      '',
      '**СДЭК:**',
      `Способ: ${payload.deliveryMethod === 'cdek_pvz' ? 'ПВЗ' : 'до двери'}`
    );
    if (payload.cdekOrderUuid) {
      cdekLines.push(`UUID: \`${escapeHtml(payload.cdekOrderUuid)}\``);
    } else if (payload.cdekOrderError) {
      cdekLines.push(`Ошибка: ${escapeHtml(payload.cdekOrderError)}`);
    } else {
      cdekLines.push('Отгрузка ещё не создана');
    }
  }
  const lines: string[] = [
    '**Заказ оплачен**',
    `Заказ: ${orderLabel}`,
    '',
    '**Состав:**',
    ...payload.items.map(
      (item) =>
        `• ${escapeHtml(item.title)} — ${item.quantity} × ${item.price.toFixed(0)} ₽ = ${(item.quantity * item.price).toFixed(0)} ₽`
    ),
    '',
    `Доставка — ${payload.shippingCost.toFixed(0)} ₽`,
    `Итого: **${payload.total.toFixed(0)} ₽**`,
    payload.promoCode ? `Промокод: ${escapeHtml(payload.promoCode)}` : '',
    payload.promoDiscountAmount != null && payload.promoDiscountAmount > 0
      ? `Скидка по промокоду: ${payload.promoDiscountAmount.toFixed(2)} ₽`
      : '',
    ...cdekLines,
    '',
    '**Доставка:**',
    `ФИО: ${escapeHtml(payload.shipping.fullName)}`,
    `Телефон: ${escapeHtml(payload.shipping.phone)}`,
    `Email: ${escapeHtml(payload.shipping.email)}`,
    `Адрес: ${escapeHtml(payload.shipping.address)}`,
    `Город: ${escapeHtml(payload.shipping.city)}, ${escapeHtml(payload.shipping.zipCode)}, ${escapeHtml(payload.shipping.country)}`,
  ];
  const adminOrdersUrl = `${siteUrl(payload.brandId)}/admin/orders`;
  const needsCdekButton = isCdek && !payload.cdekOrderUuid;
  const attachments = needsCdekButton
    ? [
        Keyboard.inlineKeyboard([
          [
            Keyboard.button.callback(
              'Создать отгрузку в СДЭК',
              `cdek_create_${payload.orderId}`.slice(0, 256)
            ),
          ],
          [Keyboard.button.link('Открыть в админке', adminOrdersUrl)],
        ]),
      ]
    : undefined;
  await sendToAdmins(payload.brandId, lines.filter(Boolean).join('\n'), { attachments });

  if (payload.promoCodeId) {
    const promoLabel = payload.promoCode ? escapeHtml(payload.promoCode) : 'промокод';
    const discountLine =
      payload.promoDiscountAmount != null && payload.promoDiscountAmount > 0
        ? `\nСкидка по промокоду: ${payload.promoDiscountAmount.toFixed(2)} ₽`
        : '';
    const partnerText =
      `💰 **Заказ по вашему промокоду**\n\n` +
      `Промокод: ${promoLabel}\n` +
      `Заказ: ${orderLabel}\n` +
      `Сумма: **${payload.total.toFixed(0)} ₽**${discountLine}`;
    for (const brandId of deliveryBrands(payload.brandId)) {
      const partnerMaxUserId = await maxService.getPartnerMaxUserIdByPromoCodeId(
        payload.promoCodeId,
        { brandId }
      );
      if (!partnerMaxUserId) continue;
      const adminUserIds = await userService.getAdminMaxUserIds(brandId);
      if (adminUserIds.includes(partnerMaxUserId)) continue;
      await sendToUsers([partnerMaxUserId], partnerText, {
        brandId,
        sourceBrandId: payload.brandId ?? 'inner',
      });
    }
  }

  if (payload.customerUserId) {
    const customerText =
      `✅ **Заказ оплачен**\n\n` +
      `Номер: ${orderLabel}\n` +
      `Сумма: **${payload.total.toFixed(0)} ₽**`;
    await sendToLinkedUser(payload.customerUserId, payload.brandId, customerText);
  }
}

export async function notifyMaxOrderStatusForUser(payload: {
  userId: string;
  orderId: string;
  orderNumber?: number | null;
  status: 'paid' | 'canceled';
  brandId?: BrandId;
}): Promise<void> {
  const statusLine = payload.status === 'paid' ? '✅ **Заказ оплачен**' : '❌ **Платёж отменён**';
  const orderUrl = `${siteUrl(payload.brandId)}/account/orders/${encodeURIComponent(payload.orderId)}`;
  const lines = [
    statusLine,
    `Заказ: \`${escapeHtml(formatOrderLabel(payload))}\``,
    orderUrl ? `Открыть заказ: ${escapeHtml(orderUrl)}` : '',
  ].filter(Boolean);
  await sendToLinkedUser(payload.userId, payload.brandId, lines.join('\n'));
}

export async function notifyMaxPaidOrderForAdmins(payload: {
  orderId: string;
  orderNumber?: number | null;
  deliveryMethod?: string | null;
  cdekOrderUuid?: string | null;
  cdekOrderError?: string | null;
  brandId?: BrandId;
}): Promise<void> {
  const isCdek =
    payload.deliveryMethod === 'cdek_pvz' || payload.deliveryMethod === 'cdek_door';
  const adminOrdersUrl = `${siteUrl(payload.brandId)}/admin/orders`;
  const lines = [
    '✅ **Заказ оплачен**',
    `Заказ: \`${escapeHtml(formatOrderLabel(payload))}\``,
    isCdek
      ? `Доставка: СДЭК (${payload.deliveryMethod === 'cdek_pvz' ? 'ПВЗ' : 'до двери'})`
      : 'Доставка: не СДЭК',
    payload.cdekOrderUuid
      ? `СДЭК UUID: \`${escapeHtml(payload.cdekOrderUuid)}\``
      : payload.cdekOrderError
        ? `СДЭК ошибка: ${escapeHtml(payload.cdekOrderError)}`
        : isCdek
          ? 'СДЭК: отгрузка ещё не создана'
          : '',
    `Открыть заказы: ${escapeHtml(adminOrdersUrl)}`,
  ].filter(Boolean)

  const attachments = isCdek && !payload.cdekOrderUuid
    ? [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('Создать отгрузку в СДЭК', `cdek_create_${payload.orderId}`.slice(0, 256))],
          [Keyboard.button.link('Открыть в админке', adminOrdersUrl)],
        ]),
      ]
    : undefined

  await sendToAdmins(payload.brandId, lines.join('\n'), { attachments });
}

export async function notifyMaxCdekTrackForUser(payload: {
  userId: string;
  orderId: string;
  orderNumber?: number | null;
  trackNumber: string;
  brandId?: BrandId;
}): Promise<void> {
  const track = payload.trackNumber.trim();
  if (!track) return;
  const trackUrl = `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(track)}`;
  const orderUrl = `${siteUrl(payload.brandId)}/account/orders/${encodeURIComponent(payload.orderId)}`;
  const lines = [
    '📦 **CDEK: трек-номер сформирован**',
    `Заказ: \`${escapeHtml(formatOrderLabel(payload))}\``,
    `Трек: \`${escapeHtml(track)}\``,
    `Отследить: ${escapeHtml(trackUrl)}`,
    orderUrl ? `Открыть заказ: ${escapeHtml(orderUrl)}` : '',
  ].filter(Boolean);
  await sendToLinkedUser(payload.userId, payload.brandId, lines.join('\n'));
}

export async function notifyMaxForm(payload: {
  formName: string;
  fields: Record<string, string>;
  brandId?: BrandId;
}): Promise<void> {
  const lines: string[] = [
    '**Новая заявка с сайта**',
    `Форма: ${escapeHtml(payload.formName)}`,
    '',
    ...Object.entries(payload.fields).map(
      ([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value || '—')}`
    ),
  ];
  await sendToAdmins(payload.brandId, lines.join('\n'));
}

export async function notifyMaxConnection(payload: {
  userId: string;
  maxUserId: string;
  brandId?: BrandId;
}): Promise<void> {
  const user = await userService.findUserProfile(payload.userId);
  const label = user
    ? [user.name, user.lastName].filter(Boolean).join(' ') || user.email
    : payload.userId;
  const text =
    '🔗 **Подключение MAX**\n\n' +
    `Пользователь ${escapeHtml(label)} привязал уведомления (MAX user ID: \`${escapeHtml(payload.maxUserId)}\`).`;
  await sendToAdmins(payload.brandId, text);
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
  await sendToUsers(recipients, lines.join('\n'), {
    header: '**Система: Inner Health и Sprint Power**',
  });
}

export async function notifyMaxPaymentError(payload: {
  orderId: string;
  total?: number;
  errorMessage: string;
  context: 'create' | 'webhook' | 'cron-poll';
  brandId?: BrandId;
}): Promise<void> {
  const contextLabel =
    payload.context === 'create'
      ? 'создание платежа'
      : payload.context === 'webhook'
        ? 'верификация в webhook'
        : 'фоновая проверка (крон)';
  const totalLine =
    payload.total !== undefined ? `Сумма: ${payload.total.toFixed(0)} ₽. ` : '';
  const text = [
    '⚠️ **Ошибка ЮKassa**',
    `Не удалось связаться с платёжной системой (${escapeHtml(contextLabel)}).`,
    '',
    `Заказ: ${escapeHtml(payload.orderId)}. ${totalLine}Ошибка: ${escapeHtml(payload.errorMessage.slice(0, 300))}`,
  ].join('\n');
  await sendToAdmins(payload.brandId, text);
}

export async function notifyMaxNewReview(payload: {
  reviewId: string;
  authorName: string;
  text: string;
  brandId?: BrandId;
}): Promise<void> {
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
  const adminUrl = `${siteUrl(payload.brandId)}/admin/reviews`;
  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('✅ Разместить', approvePayload),
      Keyboard.button.callback('❌ Отклонить', rejectPayload),
    ],
    [Keyboard.button.link('🔎 Открыть в админке', adminUrl)],
  ]);
  await sendToAdmins(payload.brandId, messageText, {
    attachments: [keyboard],
    reviewId: payload.reviewId,
  });
}

/**
 * Sends password reset link to all MAX accounts linked to the user (any brand).
 * @returns true if at least one message was delivered.
 */
export async function notifyMaxPasswordResetForUser(payload: {
  userId: string
  resetLink: string
  expiresInMinutes: number
}): Promise<boolean> {
  const links = await maxService.findMaxWhitelistEntriesByUserId(payload.userId)
  if (links.length === 0) return false

  let delivered = false
  const seenRecipients = new Set<string>()
  let sourceBrandId: BrandId = 'inner'
  try {
    sourceBrandId = resolveBrandByHost(new URL(payload.resetLink).host)
  } catch {
    // Keep the default brand for legacy relative reset links.
  }

  for (const link of links) {
    const maxUserId = link.maxUserId.trim()
    const brandId = normalizeBrandId(link.brand) ?? 'inner'
    const recipientKey = `${brandId}:${maxUserId}`
    if (!maxUserId || seenRecipients.has(recipientKey)) continue
    seenRecipients.add(recipientKey)
    const text = [
      '🔑 **Сброс пароля**',
      '',
      `Вы запросили сброс пароля на сайте ${sourceBrandId === 'sprint-power' ? 'Sprint Power' : 'Inner Health'}.`,
      `Ссылка действует ${payload.expiresInMinutes} минут:`,
      escapeHtml(payload.resetLink),
      '',
      'Если вы не запрашивали сброс — просто проигнорируйте это сообщение.',
    ].join('\n')

    const count = await sendToUsers([maxUserId], text, { brandId, sourceBrandId })
    if (count > 0) delivered = true
  }

  return delivered
}
