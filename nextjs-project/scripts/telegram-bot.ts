/**
 * Telegram-бот: long polling, /start с кодом (привязка), /promo (статистика промокодов).
 * Запуск: npm run telegram-bot (из каталога nextjs-project)
 *
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_SERVICE_SECRET, TELEGRAM_SITE_URL (в .env или .env.local)
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_SERVICE_SECRET = process.env.TELEGRAM_SERVICE_SECRET;
const TELEGRAM_SITE_URL =
  process.env.TELEGRAM_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const TELEGRAM_API = 'https://api.telegram.org';

const FETCH_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_USER = 20;
const MAX_MESSAGE_LENGTH = 500;
const MAX_START_CODE_LENGTH = 64;
const VALID_CODE_REGEX = /^[a-zA-Z0-9]+$/;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}
if (!TELEGRAM_SERVICE_SECRET) {
  console.error('Missing TELEGRAM_SERVICE_SECRET');
  process.exit(1);
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  let entry = rateLimitMap.get(userId);
  if (!entry) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(userId, entry);
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX_PER_USER;
}

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

async function getWhitelistIds(): Promise<Set<string>> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(`${base}/api/admin/telegram/whitelist`, {
      headers: { 'X-Service-Key': TELEGRAM_SERVICE_SECRET },
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error('[bot] whitelist API not ok:', res.status, raw.slice(0, 200));
      return new Set();
    }
    let data: { telegramUserIds?: string[] };
    try {
      data = JSON.parse(raw) as { telegramUserIds?: string[] };
    } catch {
      console.error('[bot] whitelist API invalid JSON:', raw.slice(0, 300));
      return new Set();
    }
    const ids = Array.isArray(data.telegramUserIds) ? data.telegramUserIds : [];
    return new Set(ids.slice(0, 1000).map((id) => String(id)));
  } catch (e) {
    console.error('[bot] getWhitelistIds error:', e instanceof Error ? e.name : e);
    return new Set();
  }
}

async function confirmLink(code: string, telegramUserId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(`${base}/api/admin/telegram/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': TELEGRAM_SERVICE_SECRET },
      body: JSON.stringify({ code: String(code).slice(0, MAX_START_CODE_LENGTH), telegramUserId: String(telegramUserId) }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string; message?: string };
    if (!res.ok) return { error: (data && typeof data.error === 'string' ? data.error : 'Request failed') || 'Request failed' };
    return { success: !!data.success, error: data.error };
  } catch (e) {
    console.error('[bot] confirmLink error:', e instanceof Error ? e.name : e);
    return { error: 'Сервис временно недоступен' };
  }
}

async function getPromoStats(): Promise<Array<{ code: string; usedCount: number; usageLimit: number | null; isActive: boolean }>> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(`${base}/api/admin/telegram/promo-stats`, {
      headers: { 'X-Service-Key': TELEGRAM_SERVICE_SECRET },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { promos?: Array<{ code: string; usedCount: number; usageLimit: number | null; isActive: boolean }> };
    const promos = Array.isArray(data.promos) ? data.promos : [];
    return promos.slice(0, 100);
  } catch (e) {
    console.error('[bot] getPromoStats error:', e instanceof Error ? e.name : e);
    return [];
  }
}

interface PartnerStatRow {
  promoCodeId: string;
  code: string;
  ordersCount: number;
  applicationsCount: number;
  partnerIncome: number;
}

async function getPartnerStatsByTelegramUserId(
  telegramUserId: string
): Promise<{ stats: PartnerStatRow[] } | { error: string }> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(
      `${base}/api/telegram/partner-stats?telegramUserId=${encodeURIComponent(telegramUserId)}`,
      { headers: { 'X-Service-Key': TELEGRAM_SERVICE_SECRET } }
    );
    const raw = await res.text();
    if (!res.ok) {
      let err: { error?: string } = {};
      try {
        err = JSON.parse(raw) as { error?: string };
      } catch {
        err = { error: raw.slice(0, 100) };
      }
      return { error: err.error || 'Не удалось загрузить статистику' };
    }
    const data = JSON.parse(raw) as { stats?: PartnerStatRow[] };
    return { stats: Array.isArray(data.stats) ? data.stats : [] };
  } catch (e) {
    console.error('[bot] getPartnerStatsByTelegramUserId error:', e instanceof Error ? e.name : e);
    return { error: 'Сервис временно недоступен' };
  }
}

async function sendMessage(chatId: string, text: string): Promise<void> {
  const safeText = String(text).slice(0, 4096);
  const url = `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: safeText, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) {
      console.error('[bot] sendMessage not ok:', res.status);
    }
  } catch (e) {
    console.error('[bot] sendMessage error:', e instanceof Error ? e.name : e);
    throw e;
  }
}

const REVIEW_APPROVE_PREFIX = 'review_approve_';
const REVIEW_REJECT_PREFIX = 'review_reject_';

async function buildHelpTextForTelegram(fromId: string): Promise<string> {
  const whitelist = await getWhitelistIds();
  if (!whitelist.has(fromId)) {
    return [
      '<b>Помощь</b>',
      '',
      'Вы пока не подключены к уведомлениям.',
      '',
      'Как подключиться:',
      '1) Откройте сайт → профиль/настройки → «Подключить Telegram»',
      '2) Перейдите по ссылке в бота и нажмите <b>Start</b>',
      '',
      'Команды:',
      '• /status — проверить, подключены ли вы',
    ].join('\n');
  }

  // Для партнёров доступна /stats. Не фейлим /help, если сервис недоступен.
  let isPartner = false;
  try {
    const partnerStats = await getPartnerStatsByTelegramUserId(fromId);
    isPartner = !('error' in partnerStats);
  } catch {
    isPartner = false;
  }

  const commands = [
    '• /status — статус подключения',
    '• /promo — список промокодов (админам)',
    ...(isPartner ? ['• /stats — статистика по вашим промокодам (партнёрам)'] : ['• /stats — статистика (только партнёрам)']),
  ];

  return [
    '<b>Помощь</b>',
    '',
    'Вы подключены к уведомлениям.',
    '',
    'Команды:',
    ...commands,
  ].join('\n');
}

async function buildWelcomeTextForTelegram(fromId: string): Promise<string> {
  const partnerRes = await getPartnerStatsByTelegramUserId(fromId);
  const isPartner = !('error' in partnerRes);
  if (!isPartner) {
    return [
      '✅ Вас подключили к уведомлениям.',
      '',
      'Вы можете:',
      '• /status — проверить подключение',
      '• /promo — промокоды (для админов/модерации)',
      '',
      'Партнёрская статистика доступна командой /stats, если Telegram привязан в личном кабинете партнёра.',
    ].join('\n');
  }

  return [
    '✅ Вас подключили к уведомлениям.',
    '',
    'Вы можете:',
    '• /status — проверить подключение',
    '• /stats — статистика по вашим промокодам',
    '',
    'Админам доступна команда /promo.',
  ].join('\n');
}

async function setReviewStatus(reviewId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; error?: string }> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(`${base}/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': TELEGRAM_SERVICE_SECRET },
      body: JSON.stringify({ status }),
    });
    let data: { success?: boolean; error?: string };
    try {
      data = (await res.json()) as { success?: boolean; error?: string };
    } catch {
      return { success: false, error: res.status === 401 ? 'Неверный сервисный ключ' : 'Сервис недоступен' };
    }
    if (!res.ok) return { success: false, error: (data?.error && typeof data.error === 'string' ? data.error : 'Request failed') || 'Request failed' };
    return { success: !!data.success, error: data.error };
  } catch (e) {
    console.error('[bot] setReviewStatus error:', e instanceof Error ? e.message : e);
    return { success: false, error: 'Сервис недоступен' };
  }
}

async function syncModerationAcrossChannels(
  reviewId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<void> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    await fetchWithTimeout(`${base}/api/admin/reviews/moderation-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': TELEGRAM_SERVICE_SECRET },
      body: JSON.stringify({ reviewId, status }),
    }).catch(() => {});
  } catch (e) {
    console.error('[bot] moderation sync error:', e instanceof Error ? e.message : e);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const url = `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  try {
    await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text ? text.slice(0, 200) : undefined }),
    });
  } catch (e) {
    console.error('[bot] answerCallbackQuery error:', e instanceof Error ? e.name : e);
  }
}

async function editMessageText(chatId: number, messageId: number, text: string): Promise<void> {
  const url = `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/editMessageText`;
  try {
    await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text.slice(0, 4096),
        parse_mode: 'HTML',
      }),
    });
  } catch (e) {
    console.error('[bot] editMessageText error:', e instanceof Error ? e.name : e);
  }
}

/** Убрать inline-кнопки у сообщения (после успешной модерации). */
async function removeMessageReplyMarkup(chatId: number, messageId: number): Promise<void> {
  const url = `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`;
  try {
    await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      }),
    });
  } catch (e) {
    console.error('[bot] removeMessageReplyMarkup error:', e instanceof Error ? e.name : e);
  }
}

type CallbackQuery = {
  id: string;
  from?: { id: number };
  data?: string;
  message?: { chat?: { id: number }; message_id?: number; text?: string };
};
type TelegramUpdate = {
  update_id: number;
  message?: { from?: { id: number }; text?: string; chat?: { id: number } };
  callback_query?: CallbackQuery;
};

async function getUpdates(offset: number): Promise<{ result?: TelegramUpdate[] }> {
  const url = `${TELEGRAM_API}/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30&limit=50`;
  const res = await fetchWithTimeout(url);
  const data = (await res.json()) as { result?: TelegramUpdate[] };
  const result = Array.isArray(data.result) ? data.result.slice(0, 50) : [];
  return { result };
}

async function run(): Promise<void> {
  let offset = 0;
  console.log('Telegram bot: long polling started. Site URL:', TELEGRAM_SITE_URL);

  while (true) {
    let updates: TelegramUpdate[] = [];
    try {
      const data = await getUpdates(offset);
      updates = data.result || [];
    } catch (e) {
      console.error('Bot getUpdates error:', e);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    for (const update of updates) {
      try {
        offset = Math.max(offset, update.update_id + 1);

        const cq = update.callback_query;
        if (cq?.id != null && cq.from?.id != null && typeof cq.data === 'string') {
          try {
            const fromId = String(cq.from.id);
            const whitelist = await getWhitelistIds();
            if (!whitelist.has(fromId)) {
              await answerCallbackQuery(cq.id, 'Доступ только для администраторов.');
              continue;
            }
            const data = cq.data;
            if (data.startsWith(REVIEW_APPROVE_PREFIX)) {
              const reviewId = data.slice(REVIEW_APPROVE_PREFIX.length).trim();
              if (!reviewId) {
                await answerCallbackQuery(cq.id, 'Ошибка: неверные данные кнопки.');
                continue;
              }
              const result = await setReviewStatus(reviewId, 'approved');
              if (result.success) {
                await answerCallbackQuery(cq.id, 'Отзыв размещён на сайте.');
                void syncModerationAcrossChannels(reviewId, 'APPROVED');
                if (cq.message?.chat?.id != null && cq.message?.message_id != null) {
                  const prev = (cq.message.text || '').replace('(на модерации)', '').trim();
                  await editMessageText(cq.message.chat.id, cq.message.message_id, prev + '\n\n✅ Размещено на сайте.');
                  await removeMessageReplyMarkup(cq.message.chat.id, cq.message.message_id);
                }
              } else {
                await answerCallbackQuery(cq.id, result.error || 'Ошибка');
              }
            } else if (data.startsWith(REVIEW_REJECT_PREFIX)) {
              const reviewId = data.slice(REVIEW_REJECT_PREFIX.length).trim();
              if (!reviewId) {
                await answerCallbackQuery(cq.id, 'Ошибка: неверные данные кнопки.');
                continue;
              }
              const result = await setReviewStatus(reviewId, 'rejected');
              if (result.success) {
                await answerCallbackQuery(cq.id, 'Отзыв отклонён.');
                void syncModerationAcrossChannels(reviewId, 'REJECTED');
                if (cq.message?.chat?.id != null && cq.message?.message_id != null) {
                  const prev = (cq.message.text || '').replace('(на модерации)', '').trim();
                  await editMessageText(cq.message.chat.id, cq.message.message_id, prev + '\n\n❌ Отклонён.');
                  await removeMessageReplyMarkup(cq.message.chat.id, cq.message.message_id);
                }
              } else {
                await answerCallbackQuery(cq.id, result.error || 'Ошибка');
              }
            } else {
              await answerCallbackQuery(cq.id, 'Неизвестная кнопка.');
            }
          } catch (callbackErr) {
            console.error('[bot] callback_query error:', callbackErr);
            await answerCallbackQuery(cq.id, 'Ошибка. Попробуйте позже.').catch(() => {});
          }
          continue;
        }

        const msg = update.message;
        if (!msg?.from?.id || msg.chat?.id == null) continue;

        const chatId = String(msg.chat.id);
        const fromId = String(msg.from.id);
        const rawText = typeof msg.text === 'string' ? msg.text : '';
        const text = rawText.trim().slice(0, MAX_MESSAGE_LENGTH);

        if (!text) continue;

        if (!checkRateLimit(fromId)) {
          await sendMessage(chatId, '⏳ Слишком много запросов. Подождите минуту.').catch(() => {});
          continue;
        }

        if (text.startsWith('/start')) {
          const parts = text.split(/\s+/);
          const code = parts[1];
          if (code) {
            const safeCode = code.slice(0, MAX_START_CODE_LENGTH);
            if (!VALID_CODE_REGEX.test(safeCode)) {
              await sendMessage(chatId, 'Неверный формат кода. Используйте ссылку из админки.').catch(() => {});
              continue;
            }
            const result = await confirmLink(safeCode, fromId);
            if (result.success) {
              const welcomeText = await buildWelcomeTextForTelegram(fromId);
              await sendMessage(chatId, welcomeText).catch(() => {});
            } else {
              const errMsg = result.error === 'Code expired' ? 'Код истёк. Создайте новую ссылку в админке (Профиль → Подключить Telegram).' : (result.error || 'Не удалось привязать. Попробуйте снова.');
              await sendMessage(chatId, errMsg).catch(() => {});
            }
          } else {
            await sendMessage(
              chatId,
              'Используйте ссылку из админки (Профиль → Подключить Telegram) или из личного кабинета партнёра на сайте, чтобы подключить уведомления.'
            ).catch(() => {});
          }
          continue;
        }

        if (text === '/help') {
          try {
            await sendMessage(chatId, await buildHelpTextForTelegram(fromId)).catch(() => {});
          } catch (e) {
            console.error('[bot] /help error:', e instanceof Error ? e.message : e);
            await sendMessage(chatId, '⚠️ Не удалось показать справку. Попробуйте позже.').catch(() => {});
          }
          continue;
        }

        if (text === '/status' || text.toLowerCase() === 'status') {
          try {
            const whitelist = await getWhitelistIds();
            if (whitelist.has(fromId)) {
              await sendMessage(
                chatId,
                '✅ Вы подключены к уведомлениям.\n\nВы получаете сообщения о новых заказах и заявках с сайта Inner Health.'
              ).catch(() => {});
            } else {
              await sendMessage(
                chatId,
                '❌ Вы не подключены к уведомлениям.\n\nПодключите через админку: Профиль → Подключить Telegram → перейдите по ссылке и нажмите Start.'
              ).catch(() => {});
            }
          } catch (e) {
            console.error('[bot] /status error:', e instanceof Error ? e.name : e);
            await sendMessage(
              chatId,
              '⚠️ Не удалось проверить статус. Убедитесь, что сайт (npm run dev) и бот (npm run telegram-bot) запущены, TELEGRAM_SITE_URL в .env указывает на работающий сайт.'
            ).catch(() => {});
          }
          continue;
        }

        if (text === '/promo') {
          const whitelist = await getWhitelistIds();
          if (!whitelist.has(fromId)) {
            await sendMessage(chatId, 'Доступ только для пользователей из списка уведомлений.').catch(() => {});
            continue;
          }
          const promos = await getPromoStats();
          if (promos.length === 0) {
            await sendMessage(chatId, 'Нет промокодов.').catch(() => {});
            continue;
          }
          const lines = promos.map((p) => {
            const limit = p.usageLimit != null ? ` / ${p.usageLimit}` : '';
            const status = p.isActive ? '✅' : '❌';
            const code = typeof p.code === 'string' ? escapeHtml(p.code.slice(0, 50)) : '';
            return `${status} <code>${code}</code> — использований: ${Number(p.usedCount) || 0}${limit}`;
          });
          await sendMessage(chatId, '<b>Промокоды</b>\n\n' + lines.join('\n')).catch(() => {});
          continue;
        }

        if (text === '/stats' || text === '/mystats') {
          const result = await getPartnerStatsByTelegramUserId(fromId);
          if ('error' in result) {
            await sendMessage(
              chatId,
              result.error === 'Not a partner or Telegram not linked'
                ? 'Доступ только для партнёров. Подключите Telegram в личном кабинете партнёра на сайте.'
                : result.error
            ).catch(() => {});
            continue;
          }
          const stats = result.stats;
          if (stats.length === 0) {
            await sendMessage(chatId, 'У вас пока нет привязанных промокодов или статистики.').catch(() => {});
            continue;
          }
          const totalOrders = stats.reduce((s, x) => s + x.ordersCount, 0);
          const totalIncome = stats.reduce((s, x) => s + x.partnerIncome, 0);
          const lines = stats.map((p) => {
            const code = escapeHtml(p.code.slice(0, 50));
            return `• <code>${code}</code> — применений: ${p.applicationsCount}, оплачено: ${p.ordersCount}, доход: ${p.partnerIncome.toFixed(0)} ₽`;
          });
          const header =
            '<b>Ваша статистика</b>\n\n' +
            `Оплачено заказов: <b>${totalOrders}</b>\n` +
            `Ваш доход: <b>${totalIncome.toFixed(0)} ₽</b>\n\n` +
            lines.join('\n');
          await sendMessage(chatId, header).catch(() => {});
          continue;
        }

        if (text.startsWith('/')) {
          await sendMessage(chatId, 'Неизвестная команда. Доступны: /help, /start, /status, /promo, /stats (для партнёров).').catch(() => {});
        }
      } catch (e) {
        console.error('Bot update error:', e);
      }
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

run();
