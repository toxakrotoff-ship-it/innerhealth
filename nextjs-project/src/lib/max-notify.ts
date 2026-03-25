import { Bot } from '@maxhub/max-bot-api';
import * as maxService from '@/services/max.service';
import * as settingsService from '@/services/settings.service';
import * as userService from '@/services/user.service';
import type { BrandId } from '@/lib/brand/brand';

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
  options?: { brandId?: BrandId | null }
): Promise<void> {
  const bot = await getMaxBot(options);
  if (!bot || userIds.length === 0) return;
  for (const userId of userIds) {
    const id = Number.parseInt(userId, 10);
    if (!Number.isFinite(id)) continue;
    await bot.api.sendMessageToUser(id, text).catch((error) => {
      console.error('[max-notify] sendMessageToUser failed', userId, error);
    });
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
    '<b>Новый заказ</b>',
    `ID: ${escapeHtml(payload.orderId)}`,
    '',
    '<b>Состав:</b>',
    ...payload.items.map(
      (item) =>
        `• ${escapeHtml(item.title)} — ${item.quantity} × ${item.price.toFixed(0)} ₽ = ${(item.quantity * item.price).toFixed(0)} ₽`
    ),
    '',
    `Итого: <b>${payload.total.toFixed(0)} ₽</b>`,
    payload.promoCode ? `Промокод: ${escapeHtml(payload.promoCode)}` : '',
    '',
    '<b>Доставка:</b>',
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
        `💰 <b>Заказ по вашему промокоду</b>\n\n` +
        `Промокод: ${promoLabel}\n` +
        `Заказ ID: ${escapeHtml(payload.orderId)}\n` +
        `Сумма: <b>${payload.total.toFixed(0)} ₽</b>`;
      await sendToUsers([partnerMaxUserId], partnerText, scope);
    }
  }

  if (payload.customerUserId) {
    const customerLink = await maxService.findMaxWhitelistByUserId(payload.customerUserId);
    if (customerLink) {
      const customerText =
        `✅ <b>Ваш заказ принят</b>\n\n` +
        `Номер: ${escapeHtml(payload.orderId)}\n` +
        `Сумма: <b>${payload.total.toFixed(0)} ₽</b>`;
      await sendToUsers([customerLink.maxUserId], customerText, scope);
    }
  }
}

export async function notifyMaxForm(payload: {
  formName: string;
  fields: Record<string, string>;
}): Promise<void> {
  const whitelist = await maxService.getMaxWhitelist();
  const lines: string[] = [
    '<b>Новая заявка с сайта</b>',
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
    '🔗 <b>Подключение MAX</b>\n\n' +
    `Пользователь ${escapeHtml(label)} привязал уведомления (MAX user ID: <code>${escapeHtml(payload.maxUserId)}</code>).`;
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
    '🛠️ <b>Infra alert</b>',
    `Severity: <b>${escapeHtml(severityLabel)}</b>`,
    `Kind: <code>${escapeHtml(payload.kind)}</code>`,
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
    '⚠️ <b>Ошибка ЮKassa</b>',
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
}): Promise<void> {
  const whitelist = await maxService.getMaxWhitelist();
  if (whitelist.length === 0) return;
  const textPreview = payload.text.length > 300 ? `${payload.text.slice(0, 297)}...` : payload.text;
  const messageText = [
    '📝 <b>Новый отзыв (на модерации)</b>',
    `Автор: ${escapeHtml(payload.authorName)}`,
    '',
    escapeHtml(textPreview),
    '',
    `ID: <code>${escapeHtml(payload.reviewId)}</code>`,
    'Модерация выполняется в админке.',
  ].join('\n');
  await sendToUsers(
    whitelist.map((row) => row.maxUserId),
    messageText
  );
}
