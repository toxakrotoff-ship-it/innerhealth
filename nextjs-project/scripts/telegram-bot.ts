/**
 * Telegram-бот: long polling, /start с кодом (привязка), /promo (статистика промокодов).
 * Запуск: npm run telegram-bot (из каталога nextjs-project)
 *
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_SERVICE_SECRET, TELEGRAM_SITE_URL (в .env или .env.local)
 */
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
import { Agent } from 'undici';
import { normalizeBrandId, type BrandId } from '@/lib/brand/brand';
import { getTelegramBotToken } from '@/services/settings.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TELEGRAM_SERVICE_SECRET = process.env.TELEGRAM_SERVICE_SECRET;
const TELEGRAM_BOT_BRAND_ID: BrandId =
  normalizeBrandId(process.env.TELEGRAM_BOT_BRAND_ID) ?? 'inner';
const TELEGRAM_SITE_URL =
  process.env.TELEGRAM_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
let telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';

const TELEGRAM_API = 'https://api.telegram.org';
const TELEGRAM_API_HOST = 'api.telegram.org';

const FETCH_TIMEOUT_MS = 15_000;
const TELEGRAM_LONG_POLL_TIMEOUT_MS = 35_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_USER = 20;
const MAX_MESSAGE_LENGTH = 500;
const MAX_START_CODE_LENGTH = 64;
const VALID_CODE_REGEX = /^[a-zA-Z0-9]+$/;

if (!TELEGRAM_SERVICE_SECRET) {
  console.error('Missing TELEGRAM_SERVICE_SECRET');
  process.exit(1);
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const telegramApiDispatcher = new Agent({
  connect: {
    timeout: 30_000,
  },
  // Helps in environments where one Telegram IP family/address intermittently stalls.
  autoSelectFamily: true,
});

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

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const dispatcher = url.includes(TELEGRAM_API_HOST) ? telegramApiDispatcher : undefined;
  const requestOptions = { ...options, signal: controller.signal, dispatcher } as RequestInit & {
    dispatcher?: Agent;
  };
  return fetch(url, requestOptions).finally(() => clearTimeout(timeoutId));
}

async function confirmLink(code: string, telegramUserId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    const brandQuery = `?brand=${encodeURIComponent(TELEGRAM_BOT_BRAND_ID)}`;
    const res = await fetchWithTimeout(`${base}/api/admin/telegram/confirm${brandQuery}`, {
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
    const brandQuery = `?brand=${encodeURIComponent(TELEGRAM_BOT_BRAND_ID)}`;
    const res = await fetchWithTimeout(`${base}/api/admin/telegram/promo-stats${brandQuery}`, {
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

interface TelegramBotCapabilities {
  isLinked: boolean;
  isAdmin: boolean;
  isPartner: boolean;
}

interface TelegramReplyMarkup {
  inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
  keyboard?: Array<Array<{ text: string }>>;
  resize_keyboard?: boolean;
  is_persistent?: boolean;
}

async function getPartnerStatsByTelegramUserId(
  telegramUserId: string
): Promise<{ stats: PartnerStatRow[] } | { error: string }> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    const brandQuery = `&brand=${encodeURIComponent(TELEGRAM_BOT_BRAND_ID)}`;
    const res = await fetchWithTimeout(
      `${base}/api/telegram/partner-stats?telegramUserId=${encodeURIComponent(telegramUserId)}${brandQuery}`,
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

async function getTelegramCapabilities(
  telegramUserId: string
): Promise<TelegramBotCapabilities> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    const brandQuery = `&brand=${encodeURIComponent(TELEGRAM_BOT_BRAND_ID)}`;
    const res = await fetchWithTimeout(
      `${base}/api/telegram/bot-capabilities?telegramUserId=${encodeURIComponent(telegramUserId)}${brandQuery}`,
      { headers: { 'X-Service-Key': TELEGRAM_SERVICE_SECRET } }
    );
    if (!res.ok) return { isLinked: false, isAdmin: false, isPartner: false };
    const data = (await res.json()) as Partial<TelegramBotCapabilities>;
    return {
      isLinked: Boolean(data.isLinked),
      isAdmin: Boolean(data.isAdmin),
      isPartner: Boolean(data.isPartner),
    };
  } catch (e) {
    console.error('[bot] getTelegramCapabilities error:', e instanceof Error ? e.name : e);
    return { isLinked: false, isAdmin: false, isPartner: false };
  }
}

function getTelegramAvailableCommands(capabilities: TelegramBotCapabilities): string[] {
  const commands = ['/help', '/status'];
  if (capabilities.isAdmin) commands.push('/promo');
  if (capabilities.isPartner) commands.push('/stats');
  return commands;
}

function buildTelegramReplyMarkup(capabilities: TelegramBotCapabilities): TelegramReplyMarkup {
  const rows: Array<Array<{ text: string }>> = [[{ text: '/status' }, { text: '/help' }]];
  const roleRow: Array<{ text: string }> = [];
  if (capabilities.isAdmin) roleRow.push({ text: '/promo' });
  if (capabilities.isPartner) roleRow.push({ text: '/stats' });
  if (roleRow.length > 0) rows.push(roleRow);
  return {
    keyboard: rows,
    resize_keyboard: true,
    is_persistent: true,
  };
}

function buildHelpTextForTelegram(capabilities: TelegramBotCapabilities): string {
  if (!capabilities.isLinked) {
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
      '• /help — помощь',
    ].join('\n');
  }

  return [
    '<b>Помощь</b>',
    '',
    'Вы подключены к уведомлениям.',
    '',
    'Команды:',
    '• /status — статус подключения',
    '• /help — помощь',
    ...(capabilities.isAdmin ? ['• /promo — список промокодов'] : []),
    ...(capabilities.isPartner ? ['• /stats — статистика по вашим промокодам'] : []),
  ].join('\n');
}

function buildWelcomeTextForTelegram(capabilities: TelegramBotCapabilities): string {
  return [
    '✅ Вас подключили к уведомлениям.',
    '',
    'Доступные команды:',
    ...getTelegramAvailableCommands(capabilities)
      .filter((command) => command !== '/help')
      .map((command) => `• ${command}`),
  ].join('\n');
}

function buildUnknownCommandTextForTelegram(capabilities: TelegramBotCapabilities): string {
  return `Неизвестная команда. Доступны: ${getTelegramAvailableCommands(capabilities).join(', ')}.`;
}

async function sendMessage(
  chatId: string,
  text: string,
  options?: { replyMarkup?: TelegramReplyMarkup }
): Promise<void> {
  const safeText = String(text).slice(0, 4096);
  const url = `${TELEGRAM_API}/bot${telegramBotToken}/sendMessage`;
  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: safeText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (options?.replyMarkup) {
      body.reply_markup = options.replyMarkup;
    }
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

type ReviewModerationResponse = {
  success: boolean;
  message: string;
  reason?: 'updated' | 'already_moderated' | 'not_found' | 'unauthorized' | 'invalid' | 'error';
  syncWarnings?: string[];
};

async function setReviewStatus(
  reviewId: string,
  status: 'APPROVED' | 'REJECTED',
  correlationId: string
): Promise<ReviewModerationResponse> {
  try {
    const base = TELEGRAM_SITE_URL.replace(/\/$/, '');
    console.info('[bot] moderation request started', { correlationId, reviewId, status });
    const res = await fetchWithTimeout(`${base}/api/admin/reviews/moderation-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Key': TELEGRAM_SERVICE_SECRET },
      body: JSON.stringify({ reviewId, status, correlationId }),
    });
    let data: Partial<ReviewModerationResponse> | undefined;
    try {
      data = (await res.json()) as Partial<ReviewModerationResponse>;
    } catch {
      return {
        success: false,
        reason: res.status === 401 ? 'unauthorized' : 'error',
        message: res.status === 401 ? 'Доступ только для администраторов.' : 'Не удалось обработать модерацию. Попробуйте ещё раз.',
        syncWarnings: [],
      };
    }
    if (!res.ok) {
      console.error('[bot] moderation action not ok:', {
        reviewId,
        status,
        httpStatus: res.status,
        reason: data?.reason,
      });
    }
    const result = {
      success: Boolean(data?.success),
      reason: data?.reason,
      message: typeof data?.message === 'string' && data.message
        ? data.message
        : 'Не удалось обработать модерацию. Попробуйте ещё раз.',
      syncWarnings: Array.isArray(data?.syncWarnings) ? data.syncWarnings : [],
    };
    console.info('[bot] moderation response', {
      correlationId,
      reviewId,
      status,
      success: result.success,
      reason: result.reason,
      syncWarnings: result.syncWarnings,
    });
    return result;
  } catch (e) {
    console.error('[bot] moderation action error:', {
      correlationId,
      reviewId,
      status,
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      success: false,
      reason: 'error',
      message: 'Не удалось обработать модерацию. Попробуйте ещё раз.',
      syncWarnings: [],
    };
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const url = `${TELEGRAM_API}/bot${telegramBotToken}/answerCallbackQuery`;
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
  const url = `${TELEGRAM_API}/bot${telegramBotToken}/getUpdates?offset=${offset}&timeout=30&limit=50`;
  const res = await fetchWithTimeout(url, {}, TELEGRAM_LONG_POLL_TIMEOUT_MS);
  const data = (await res.json()) as { result?: TelegramUpdate[] };
  const result = Array.isArray(data.result) ? data.result.slice(0, 50) : [];
  return { result };
}

async function run(): Promise<void> {
  telegramBotToken = (await getTelegramBotToken({ brandId: TELEGRAM_BOT_BRAND_ID }))?.trim() ?? '';
  if (!telegramBotToken) {
    throw new Error(`Telegram bot token is not configured for brand "${TELEGRAM_BOT_BRAND_ID}".`);
  }
  let offset = 0;
  console.log('Telegram bot: long polling started.', {
    siteUrl: TELEGRAM_SITE_URL,
    brandId: TELEGRAM_BOT_BRAND_ID,
  });

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
            const data = cq.data;
            const correlationId = randomUUID();
            console.info('[bot] callback received', {
              correlationId,
              callbackQueryId: cq.id,
              fromId,
              data,
            });
            if (data.startsWith(REVIEW_APPROVE_PREFIX)) {
              const reviewId = data.slice(REVIEW_APPROVE_PREFIX.length).trim();
              if (!reviewId) {
                await answerCallbackQuery(cq.id, 'Ошибка: неверные данные кнопки.');
                continue;
              }
              await answerCallbackQuery(cq.id, 'Обрабатываю...');
              console.info('[bot] callback ack sent', { correlationId, callbackQueryId: cq.id });
              const capabilities = await getTelegramCapabilities(fromId);
              console.info('[bot] capabilities resolved', {
                correlationId,
                fromId,
                isAdmin: capabilities.isAdmin,
                isLinked: capabilities.isLinked,
                isPartner: capabilities.isPartner,
              });
              if (!capabilities.isAdmin) {
                if (cq.message?.chat?.id != null) {
                  await sendMessage(String(cq.message.chat.id), 'Доступ только для администраторов.').catch(() => {});
                }
                continue;
              }
              const result = await setReviewStatus(reviewId, 'APPROVED', correlationId);
              if (!result.success && cq.message?.chat?.id != null) {
                await sendMessage(String(cq.message.chat.id), result.message).catch(() => {});
              }
            } else if (data.startsWith(REVIEW_REJECT_PREFIX)) {
              const reviewId = data.slice(REVIEW_REJECT_PREFIX.length).trim();
              if (!reviewId) {
                await answerCallbackQuery(cq.id, 'Ошибка: неверные данные кнопки.');
                continue;
              }
              await answerCallbackQuery(cq.id, 'Обрабатываю...');
              console.info('[bot] callback ack sent', { correlationId, callbackQueryId: cq.id });
              const capabilities = await getTelegramCapabilities(fromId);
              console.info('[bot] capabilities resolved', {
                correlationId,
                fromId,
                isAdmin: capabilities.isAdmin,
                isLinked: capabilities.isLinked,
                isPartner: capabilities.isPartner,
              });
              if (!capabilities.isAdmin) {
                if (cq.message?.chat?.id != null) {
                  await sendMessage(String(cq.message.chat.id), 'Доступ только для администраторов.').catch(() => {});
                }
                continue;
              }
              const result = await setReviewStatus(reviewId, 'REJECTED', correlationId);
              if (!result.success && cq.message?.chat?.id != null) {
                await sendMessage(String(cq.message.chat.id), result.message).catch(() => {});
              }
            } else {
              const capabilities = await getTelegramCapabilities(fromId);
              if (!capabilities.isAdmin) {
                await answerCallbackQuery(cq.id, 'Доступ только для администраторов.');
                continue;
              }
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
              const capabilities = await getTelegramCapabilities(fromId);
              await sendMessage(chatId, buildWelcomeTextForTelegram(capabilities), {
                replyMarkup: buildTelegramReplyMarkup(capabilities),
              }).catch(() => {});
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
            const capabilities = await getTelegramCapabilities(fromId);
            await sendMessage(chatId, buildHelpTextForTelegram(capabilities), {
              replyMarkup: buildTelegramReplyMarkup(capabilities),
            }).catch(() => {});
          } catch (e) {
            console.error('[bot] /help error:', e instanceof Error ? e.message : e);
            await sendMessage(chatId, '⚠️ Не удалось показать справку. Попробуйте позже.').catch(() => {});
          }
          continue;
        }

        if (text === '/status' || text.toLowerCase() === 'status') {
          try {
            const capabilities = await getTelegramCapabilities(fromId);
            if (capabilities.isLinked) {
              await sendMessage(
                chatId,
                '✅ Вы подключены к уведомлениям.',
                { replyMarkup: buildTelegramReplyMarkup(capabilities) }
              ).catch(() => {});
            } else {
              await sendMessage(
                chatId,
                '❌ Вы не подключены к уведомлениям.\n\nПодключите через админку: Профиль → Подключить Telegram → перейдите по ссылке и нажмите Start.',
                { replyMarkup: buildTelegramReplyMarkup(capabilities) }
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
          const capabilities = await getTelegramCapabilities(fromId);
          if (!capabilities.isAdmin) {
            await sendMessage(chatId, 'Доступ только для администраторов.', {
              replyMarkup: buildTelegramReplyMarkup(capabilities),
            }).catch(() => {});
            continue;
          }
          const promos = await getPromoStats();
          if (promos.length === 0) {
            await sendMessage(chatId, 'Нет промокодов.', {
              replyMarkup: buildTelegramReplyMarkup(capabilities),
            }).catch(() => {});
            continue;
          }
          const lines = promos.map((p) => {
            const limit = p.usageLimit != null ? ` / ${p.usageLimit}` : '';
            const status = p.isActive ? '✅' : '❌';
            const code = typeof p.code === 'string' ? escapeHtml(p.code.slice(0, 50)) : '';
            return `${status} <code>${code}</code> — использований: ${Number(p.usedCount) || 0}${limit}`;
          });
          await sendMessage(chatId, '<b>Промокоды</b>\n\n' + lines.join('\n'), {
            replyMarkup: buildTelegramReplyMarkup(capabilities),
          }).catch(() => {});
          continue;
        }

        if (text === '/stats' || text === '/mystats') {
          const capabilities = await getTelegramCapabilities(fromId);
          if (!capabilities.isPartner) {
            await sendMessage(
              chatId,
              'Доступ только для партнёров. Подключите Telegram в личном кабинете партнёра на сайте.',
              { replyMarkup: buildTelegramReplyMarkup(capabilities) }
            ).catch(() => {});
            continue;
          }
          const result = await getPartnerStatsByTelegramUserId(fromId);
          if ('error' in result) {
            await sendMessage(
              chatId,
              result.error === 'Not a partner or Telegram not linked'
                ? 'Доступ только для партнёров. Подключите Telegram в личном кабинете партнёра на сайте.'
                : result.error,
              { replyMarkup: buildTelegramReplyMarkup(capabilities) }
            ).catch(() => {});
            continue;
          }
          const stats = result.stats;
          if (stats.length === 0) {
            await sendMessage(chatId, 'У вас пока нет привязанных промокодов или статистики.', {
              replyMarkup: buildTelegramReplyMarkup(capabilities),
            }).catch(() => {});
            continue;
          }
          const totalOrders = stats.reduce((s, x) => s + x.ordersCount, 0);
          const lines = stats.map((p) => {
            const code = escapeHtml(p.code.slice(0, 50));
            return `• <code>${code}</code> — заказов: ${p.ordersCount}`;
          });
          const header =
            '<b>Ваша статистика</b>\n\n' +
            `Всего заказов: <b>${totalOrders}</b>\n\n` +
            lines.join('\n');
          await sendMessage(chatId, header, {
            replyMarkup: buildTelegramReplyMarkup(capabilities),
          }).catch(() => {});
          continue;
        }

        if (text.startsWith('/')) {
          const capabilities = await getTelegramCapabilities(fromId);
          await sendMessage(chatId, buildUnknownCommandTextForTelegram(capabilities), {
            replyMarkup: buildTelegramReplyMarkup(capabilities),
          }).catch(() => {});
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
