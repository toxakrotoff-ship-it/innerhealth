import * as telegramService from '@/services/telegram.service';
import * as userService from '@/services/user.service';
import * as settingsService from '@/services/settings.service';
import * as reviewModerationMessageService from '@/services/review-moderation-message.service';
import type { BrandId } from '@/lib/brand/brand';

const TELEGRAM_API = 'https://api.telegram.org';

async function getWhitelistChatIds(
  token: string | undefined,
  options?: { brandId?: BrandId | null }
): Promise<string[]> {
  if (!token) return [];
  const list = await telegramService.getTelegramWhitelist(options);
  return list.map((r) => r.telegramUserId);
}

interface SendMessageOptions {
  replyMarkup?: {
    inline_keyboard: Array<Array<{ text: string; callback_data: string } | { text: string; url: string }>>;
  };
}

async function sendMessage(
  token: string | undefined,
  chatId: string,
  text: string,
  options?: SendMessageOptions
): Promise<number | null> {
  if (!token) return null;
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (options?.replyMarkup) {
    body.reply_markup = options.replyMarkup;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[telegram-notify] sendMessage failed:', res.status, err);
    return null;
  }
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; result?: { message_id?: number } }
    | null;
  const messageId = data?.result?.message_id;
  return typeof messageId === 'number' ? messageId : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface OrderNotifyPayload {
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
  /** If set, partner linked to this promo will receive a separate short notification. */
  promoCodeId?: string | null;
  /** Соответствует scope настроек в админке (telegram_bot_token и т.д.). */
  brandId?: BrandId;
}

export function notifyTelegramOrder(payload: OrderNotifyPayload): void {
  const settingsScope = payload.brandId ? { brandId: payload.brandId } : {};
  settingsService.getTelegramBotToken(settingsScope).then((token) => {
    if (!token) return null;
    return getWhitelistChatIds(token, settingsScope).then((chatIds) => ({ token, chatIds }));
  }).then(async (result) => {
    if (!result || result.chatIds.length === 0) return;
    const { token, chatIds } = result;
    const lines: string[] = [
      '<b>Новый заказ</b>',
      `ID: ${escapeHtml(payload.orderId)}`,
      '',
      '<b>Состав:</b>',
      ...payload.items.map(
        (i) =>
          `• ${escapeHtml(i.title)} — ${i.quantity} × ${i.price.toFixed(0)} ₽ = ${(i.quantity * i.price).toFixed(0)} ₽`
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
    const text = lines.filter(Boolean).join('\n');
    for (const chatId of chatIds) {
      await sendMessage(token, chatId, text).catch((e) =>
        console.error('[telegram-notify] order notify error:', e)
      );
    }
    // Notify partner whose promo was used (if linked to Telegram)
    if (payload.promoCodeId) {
      telegramService
        .getPartnerTelegramUserIdByPromoCodeId(payload.promoCodeId, settingsScope)
        .then((partnerChatId) => {
          if (!partnerChatId || !token) return;
          const promoLabel = payload.promoCode ? escapeHtml(payload.promoCode) : 'промокод';
          const partnerText =
            `💰 <b>Заказ по вашему промокоду</b>\n\n` +
            `Промокод: ${promoLabel}\n` +
            `Заказ ID: ${escapeHtml(payload.orderId)}\n` +
            `Сумма: <b>${payload.total.toFixed(0)} ₽</b>`;
          return sendMessage(token, partnerChatId, partnerText).catch((e) =>
            console.error('[telegram-notify] partner order notify error:', e)
          );
        })
        .catch((e) => console.error('[telegram-notify] getPartnerTelegramUserIdByPromoCodeId:', e));
    }
  }).catch((e) => console.error('[telegram-notify] getWhitelistChatIds:', e));
}

export async function notifyTelegramOrderStatusForUser(payload: {
  userId: string;
  orderId: string;
  status: 'paid' | 'canceled';
  brandId?: BrandId;
}): Promise<void> {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  const token = await settingsService.getTelegramBotToken(scope);
  if (!token) return;
  const whitelist = await telegramService.findTelegramWhitelistByUserId(payload.userId, scope);
  if (!whitelist?.telegramUserId) return;

  const statusLine = payload.status === 'paid' ? '✅ <b>Заказ оплачен</b>' : '❌ <b>Платёж отменён</b>';
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    '';
  const orderUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/account/orders/${encodeURIComponent(payload.orderId)}` : '';
  const lines = [
    statusLine,
    `ID: <code>${escapeHtml(payload.orderId)}</code>`,
    orderUrl ? `Открыть заказ: ${escapeHtml(orderUrl)}` : '',
  ].filter(Boolean);
  await sendMessage(token, whitelist.telegramUserId, lines.join('\n')).catch(() => {});
}

export async function notifyTelegramPaidOrderForAdmins(payload: {
  orderId: string;
  deliveryMethod?: string | null;
  cdekOrderUuid?: string | null;
  cdekOrderError?: string | null;
  brandId?: BrandId;
}): Promise<void> {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  const token = await settingsService.getTelegramBotToken(scope);
  if (!token) return;

  const chatIds = await userService.getAdminTelegramChatIds(payload.brandId);
  if (chatIds.length === 0) return;

  const isCdek =
    payload.deliveryMethod === 'cdek_pvz' || payload.deliveryMethod === 'cdek_door';
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    '';
  const adminOrderUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/admin/orders`
    : '';
  const lines = [
    '✅ <b>Заказ оплачен</b>',
    `ID: <code>${escapeHtml(payload.orderId)}</code>`,
    isCdek
      ? `Доставка: СДЭК (${payload.deliveryMethod === 'cdek_pvz' ? 'ПВЗ' : 'до двери'})`
      : 'Доставка: не СДЭК',
    payload.cdekOrderUuid
      ? `СДЭК UUID: <code>${escapeHtml(payload.cdekOrderUuid)}</code>`
      : payload.cdekOrderError
        ? `СДЭК ошибка: ${escapeHtml(payload.cdekOrderError)}`
        : isCdek
          ? 'СДЭК: отгрузка ещё не создана'
          : '',
    adminOrderUrl ? `Открыть заказы: ${escapeHtml(adminOrderUrl)}` : '',
  ].filter(Boolean)

  const replyMarkup =
    isCdek && !payload.cdekOrderUuid
      ? {
          inline_keyboard: [
            [
              {
                text: 'Создать отгрузку в СДЭК',
                callback_data: `cdek_create_${payload.orderId}`.slice(0, 64),
              },
            ],
          ],
        }
      : undefined

  for (const chatId of chatIds) {
    await sendMessage(token, chatId, lines.join('\n'), { replyMarkup }).catch((error) =>
      console.error('[telegram-notify] paid admin notify error:', error)
    )
  }
}

export async function notifyTelegramCdekTrackForUser(payload: {
  userId: string;
  orderId: string;
  trackNumber: string;
  brandId?: BrandId;
}): Promise<void> {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  const token = await settingsService.getTelegramBotToken(scope);
  if (!token) return;
  const whitelist = await telegramService.findTelegramWhitelistByUserId(payload.userId, scope);
  if (!whitelist?.telegramUserId) return;

  const track = payload.trackNumber.trim();
  if (!track) return;
  const trackUrl = `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(track)}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    '';
  const orderUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/account/orders/${encodeURIComponent(payload.orderId)}` : '';
  const lines = [
    '📦 <b>CDEK: трек-номер сформирован</b>',
    `Заказ: <code>${escapeHtml(payload.orderId)}</code>`,
    `Трек: <code>${escapeHtml(track)}</code>`,
    `Отследить: ${escapeHtml(trackUrl)}`,
    orderUrl ? `Открыть заказ: ${escapeHtml(orderUrl)}` : '',
  ].filter(Boolean);
  await sendMessage(token, whitelist.telegramUserId, lines.join('\n')).catch(() => {});
}

export interface FormNotifyPayload {
  formName: string;
  fields: Record<string, string>;
  brandId?: BrandId;
}

export function notifyTelegramForm(payload: FormNotifyPayload): void {
  const scope = payload.brandId ? { brandId: payload.brandId } : {};
  settingsService.getTelegramBotToken(scope).then((token) => {
    if (!token) return;
    return getWhitelistChatIds(token, scope).then(async (chatIds) => {
      if (chatIds.length === 0) return;
      const lines: string[] = [
        '<b>Новая заявка с сайта</b>',
        `Форма: ${escapeHtml(payload.formName)}`,
        '',
        ...Object.entries(payload.fields).map(
          ([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value || '—')}`
        ),
      ];
      const text = lines.join('\n');
      for (const chatId of chatIds) {
        await sendMessage(token, chatId, text).catch((e) =>
          console.error('[telegram-notify] form notify error:', e)
        );
      }
    });
  }).catch((e) => console.error('[telegram-notify] getWhitelistChatIds:', e));
}

export interface ConnectionNotifyPayload {
  userId: string;
  telegramUserId: string;
  brandId?: BrandId;
}

export interface ReviewNotifyPayload {
  reviewId: string;
  authorName: string;
  text: string;
  brandId?: BrandId;
}

/** Уведомление в Telegram о новом отзыве с кнопками «Разместить» / «Отклонить». Только для чатов из вайтлиста. */
export function notifyTelegramNewReview(payload: ReviewNotifyPayload): void {
  const { reviewId, authorName, text, brandId } = payload;
  const settingsScope = brandId ? { brandId } : {};
  settingsService.getTelegramBotToken(settingsScope).then((token) => {
    if (!token) return;
    return getWhitelistChatIds(token, settingsScope).then(async (chatIds) => {
      if (chatIds.length === 0) return;
      const textPreview = text.length > 300 ? text.slice(0, 297) + '…' : text;
      const lines: string[] = [
        '📝 <b>Новый отзыв (на модерации)</b>',
        `Автор: ${escapeHtml(authorName)}`,
        '',
        escapeHtml(textPreview),
      ];
      const messageText = lines.join('\n');
      const callbackDataPrefix = 'review_';
      const approveData = callbackDataPrefix + 'approve_' + reviewId;
      const rejectData = callbackDataPrefix + 'reject_' + reviewId;
      if (approveData.length > 64 || rejectData.length > 64) {
        console.error('[telegram-notify] review id too long for callback_data');
      }
      const replyMarkup = {
        inline_keyboard: [
          [
            { text: '✅ Разместить', callback_data: approveData.slice(0, 64) },
            { text: '❌ Отклонить', callback_data: rejectData.slice(0, 64) },
          ],
        ],
      };
      for (const chatId of chatIds) {
        const messageId = await sendMessage(token, chatId, messageText, { replyMarkup }).catch((e) =>
          console.error('[telegram-notify] review notify error:', e)
        );
        if (messageId) {
          await reviewModerationMessageService
            .upsertReviewModerationMessage({
              reviewId,
              channel: 'TELEGRAM',
              recipientId: chatId,
              messageId: String(messageId),
            })
            .catch((error) => {
              console.error('[telegram-notify] failed to store moderation message id', {
                channel: 'TELEGRAM',
                reviewId,
                recipientId: chatId,
                messageId,
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }
      }
    });
  }).catch((e) => console.error('[telegram-notify] getWhitelistChatIds:', e));
}

export interface PaymentErrorNotifyPayload {
  orderId: string;
  /** Сумма заказа в рублях (опционально, например для webhook неизвестна). */
  total?: number;
  errorMessage: string;
  /** Контекст: создание платежа при оформлении заказа или верификация в webhook. */
  context: 'create' | 'webhook';
  brandId?: BrandId;
}

/** Алерт в Telegram при ошибке ЮKassa (нет связи с платёжной системой, ошибка API и т.д.). */
export function notifyTelegramPaymentError(payload: PaymentErrorNotifyPayload): void {
  const { orderId, total, errorMessage, context, brandId } = payload;
  const settingsScope = brandId ? { brandId } : {};
  settingsService.getTelegramBotToken(settingsScope).then((token) => {
    if (!token) return;
    return getWhitelistChatIds(token, settingsScope);
  }).then(async (chatIds) => {
    if (!chatIds || chatIds.length === 0) return;
    const contextLabel = context === 'create' ? 'создание платежа' : 'верификация в webhook';
    const totalStr =
      total !== undefined && total !== null
        ? `Сумма: ${total.toFixed(0)} ₽. `
        : '';
    const lines: string[] = [
      '⚠️ <b>Ошибка ЮKassa</b>',
      `Не удалось связаться с платёжной системой (${escapeHtml(contextLabel)}).`,
      '',
      `Заказ: ${escapeHtml(orderId)}. ${totalStr}Ошибка: ${escapeHtml(errorMessage.slice(0, 300))}`,
    ];
    const text = lines.join('\n');
    return settingsService.getTelegramBotToken(settingsScope).then((token) => {
      if (!token) return;
      for (const chatId of chatIds) {
        sendMessage(token, chatId, text).catch((e) =>
          console.error('[telegram-notify] payment error notify:', e)
        );
      }
    });
  }).catch((e) => console.error('[telegram-notify] payment error getWhitelistChatIds:', e));
}

export interface InfraAlertNotifyPayload {
  kind: 'disk' | 'memory' | 'cpu' | 'container' | 'custom';
  severity: 'info' | 'warn' | 'critical';
  message: string;
}

/** Тех. алерт (VPS/инфраструктура). Доставка только тех-админам (opt-in + привязанный Telegram). */
export async function notifyTelegramInfraAlert(payload: InfraAlertNotifyPayload): Promise<void> {
  const token = await settingsService.getTelegramBotToken();
  if (!token) return;

  const chatIds = await userService.getInfraAlertTelegramChatIds();
  if (chatIds.length === 0) return;

  const severityLabel =
    payload.severity === 'critical' ? 'CRITICAL' : payload.severity === 'warn' ? 'WARN' : 'INFO';
  const lines: string[] = [
    `🛠️ <b>Infra alert</b>`,
    `Severity: <b>${escapeHtml(severityLabel)}</b>`,
    `Kind: <code>${escapeHtml(payload.kind)}</code>`,
    '',
    escapeHtml(payload.message),
  ];
  const text = lines.join('\n');

  for (const chatId of chatIds) {
    await sendMessage(token, chatId, text).catch((e) =>
      console.error('[telegram-notify] infra alert notify error:', e)
    );
  }
}

/** Уведомление в Telegram о том, что пользователь привязал аккаунт (подключился к уведомлениям). */
export function notifyTelegramConnection(payload: ConnectionNotifyPayload): void {
  const { userId, telegramUserId, brandId } = payload;
  const scope = brandId ? { brandId } : {};
  settingsService.getTelegramBotToken(scope).then((token) => {
    if (!token) return null;
    return getWhitelistChatIds(token, scope).then((chatIds) =>
      userService.findUserProfile(userId).then((user) => ({ token, chatIds, user }))
    );
  }).then(async (result) => {
    if (!result || result.chatIds.length === 0) return;
    const { token, chatIds, user } = result;
    const label = user
      ? [user.name, user.lastName].filter(Boolean).join(' ') || user.email
      : userId;
    const text =
      '🔗 <b>Подключение Telegram</b>\n\n' +
      `Пользователь ${escapeHtml(label)} привязал уведомления (Telegram ID: <code>${escapeHtml(telegramUserId)}</code>).`;
    for (const chatId of chatIds) {
      await sendMessage(token, chatId, text).catch((e) =>
        console.error('[telegram-notify] connection notify error:', e)
      );
    }
  }).catch((e) => console.error('[telegram-notify] connection notify:', e));
}
