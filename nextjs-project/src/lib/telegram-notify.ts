import * as telegramService from '@/services/telegram.service';
import * as userService from '@/services/user.service';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = 'https://api.telegram.org';

async function getWhitelistChatIds(): Promise<string[]> {
  if (!TELEGRAM_BOT_TOKEN) return [];
  const list = await telegramService.getTelegramWhitelist();
  return list.map((r) => r.telegramUserId);
}

interface SendMessageOptions {
  replyMarkup?: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };
}

async function sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return;
  const url = `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
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
  }
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
}

export function notifyTelegramOrder(payload: OrderNotifyPayload): void {
  const chatIdsPromise = getWhitelistChatIds();
  chatIdsPromise.then(async (chatIds) => {
    if (chatIds.length === 0) return;
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
      await sendMessage(chatId, text).catch((e) =>
        console.error('[telegram-notify] order notify error:', e)
      );
    }
  }).catch((e) => console.error('[telegram-notify] getWhitelistChatIds:', e));
}

export interface FormNotifyPayload {
  formName: string;
  fields: Record<string, string>;
}

export function notifyTelegramForm(payload: FormNotifyPayload): void {
  const chatIdsPromise = getWhitelistChatIds();
  chatIdsPromise.then(async (chatIds) => {
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
      await sendMessage(chatId, text).catch((e) =>
        console.error('[telegram-notify] form notify error:', e)
      );
    }
  }).catch((e) => console.error('[telegram-notify] getWhitelistChatIds:', e));
}

export interface ConnectionNotifyPayload {
  userId: string;
  telegramUserId: string;
}

export interface ReviewNotifyPayload {
  reviewId: string;
  authorName: string;
  text: string;
}

/** Уведомление в Telegram о новом отзыве с кнопками «Разместить» / «Отклонить». Только для чатов из вайтлиста. */
export function notifyTelegramNewReview(payload: ReviewNotifyPayload): void {
  const { reviewId, authorName, text } = payload;
  const chatIdsPromise = getWhitelistChatIds();
  chatIdsPromise.then(async (chatIds) => {
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
      await sendMessage(chatId, messageText, { replyMarkup }).catch((e) =>
        console.error('[telegram-notify] review notify error:', e)
      );
    }
  }).catch((e) => console.error('[telegram-notify] getWhitelistChatIds:', e));
}

/** Уведомление в Telegram о том, что пользователь привязал аккаунт (подключился к уведомлениям). */
export function notifyTelegramConnection(payload: ConnectionNotifyPayload): void {
  const { userId, telegramUserId } = payload;
  Promise.all([
    getWhitelistChatIds(),
    userService.findUserProfile(userId),
  ])
    .then(async ([chatIds, user]) => {
      if (chatIds.length === 0) return;
      const label = user
        ? [user.name, user.lastName].filter(Boolean).join(' ') || user.email
        : userId;
      const text =
        '🔗 <b>Подключение Telegram</b>\n\n' +
        `Пользователь ${escapeHtml(label)} привязал уведомления (Telegram ID: <code>${escapeHtml(telegramUserId)}</code>).`;
      for (const chatId of chatIds) {
        await sendMessage(chatId, text).catch((e) =>
          console.error('[telegram-notify] connection notify error:', e)
        );
      }
    })
    .catch((e) => console.error('[telegram-notify] connection notify:', e));
}
