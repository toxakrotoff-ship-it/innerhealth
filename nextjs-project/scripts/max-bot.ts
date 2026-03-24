import 'dotenv/config';
import { Bot } from '@maxhub/max-bot-api';
import { getMaxBotConfig } from '../src/lib/max/max-config';

const FETCH_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_USER = 20;
const MAX_MESSAGE_LENGTH = 500;
const MAX_START_CODE_LENGTH = 64;
const VALID_CODE_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_SERVICE_SECRET = process.env.MAX_SERVICE_SECRET;
const MAX_SITE_URL =
  process.env.MAX_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface MaxBotContextLike {
  user?: { user_id?: string | number };
  message?: { body?: { text?: string | null } | null } | null;
  reply: (text: string) => Promise<unknown> | unknown;
}

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

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

async function getWhitelistIds(): Promise<Set<string>> {
  if (!MAX_SERVICE_SECRET) return new Set();
  try {
    const base = MAX_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(`${base}/api/admin/max/whitelist`, {
      headers: { 'X-Service-Key': MAX_SERVICE_SECRET },
    });
    const data = (await res.json()) as { maxUserIds?: string[] };
    return new Set(Array.isArray(data.maxUserIds) ? data.maxUserIds.map(String) : []);
  } catch (error) {
    console.error('[max-bot] getWhitelistIds error:', error);
    return new Set();
  }
}

async function confirmLink(code: string, maxUserId: string): Promise<{ success?: boolean; error?: string }> {
  if (!MAX_SERVICE_SECRET) return { error: 'MAX_SERVICE_SECRET is missing' };
  try {
    const base = MAX_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(`${base}/api/admin/max/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': MAX_SERVICE_SECRET,
      },
      body: JSON.stringify({
        code: String(code).slice(0, MAX_START_CODE_LENGTH),
        maxUserId: String(maxUserId),
      }),
    });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok) return { error: data.error || 'Request failed' };
    return { success: Boolean(data.success), error: data.error };
  } catch (error) {
    console.error('[max-bot] confirmLink error:', error);
    return { error: 'Сервис временно недоступен' };
  }
}

async function getPromoStats(): Promise<Array<{ code: string; usedCount: number; usageLimit: number | null; isActive: boolean }>> {
  if (!MAX_SERVICE_SECRET) return [];
  try {
    const base = MAX_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(`${base}/api/admin/telegram/promo-stats`, {
      headers: { 'X-Service-Key': MAX_SERVICE_SECRET },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { promos?: Array<{ code: string; usedCount: number; usageLimit: number | null; isActive: boolean }> };
    return Array.isArray(data.promos) ? data.promos.slice(0, 100) : [];
  } catch (error) {
    console.error('[max-bot] getPromoStats error:', error);
    return [];
  }
}

async function getPartnerStats(maxUserId: string): Promise<{ stats: Array<{ code: string; ordersCount: number; applicationsCount: number; partnerIncome: number }> } | { error: string }> {
  if (!MAX_SERVICE_SECRET) return { error: 'MAX_SERVICE_SECRET is missing' };
  try {
    const base = MAX_SITE_URL.replace(/\/$/, '');
    const res = await fetchWithTimeout(
      `${base}/api/max/partner-stats?maxUserId=${encodeURIComponent(maxUserId)}`,
      { headers: { 'X-Service-Key': MAX_SERVICE_SECRET } }
    );
    const data = (await res.json()) as { stats?: Array<{ code: string; ordersCount: number; applicationsCount: number; partnerIncome: number }>; error?: string };
    if (!res.ok) return { error: data.error || 'Не удалось загрузить статистику' };
    return { stats: Array.isArray(data.stats) ? data.stats : [] };
  } catch (error) {
    console.error('[max-bot] getPartnerStats error:', error);
    return { error: 'Сервис временно недоступен' };
  }
}

async function bootstrap(): Promise<void> {
  const config = await getMaxBotConfig();
  if (!config.token) {
    throw new Error('MAX bot token is not configured. Set max_bot_token in admin settings or MAX_BOT_TOKEN.');
  }

  if (config.mode !== 'polling') {
    console.log('[max-bot] MAX_BOT_MODE is not polling. Runner exits.');
    return;
  }

  const bot = new Bot(config.token);

  bot.on('bot_started', (ctx) => {
    const botStartedContext = ctx as MaxBotContextLike & { startPayload?: unknown };
    const startPayload =
      typeof botStartedContext.startPayload === 'string' ? botStartedContext.startPayload : null;
    if (startPayload) {
      const safeCode = startPayload.slice(0, MAX_START_CODE_LENGTH);
      if (!VALID_CODE_REGEX.test(safeCode)) {
        return botStartedContext.reply('Неверный формат кода. Используйте ссылку из админки.');
      }
      const maxUserId = String(botStartedContext.user?.user_id ?? '');
      if (!maxUserId) {
        return botStartedContext.reply('Не удалось определить ваш MAX user id. Попробуйте позже.');
      }
      return confirmLink(safeCode, maxUserId).then((result) => {
        if (result.success) {
          return botStartedContext.reply(
            '✅ Вас подключили к уведомлениям. Доступны команды /status, /promo, /stats.'
          );
        }
        return botStartedContext.reply(result.error || 'Не удалось привязать. Попробуйте снова.');
      });
    }
    return botStartedContext.reply('Используйте ссылку из админки, чтобы подключить уведомления.');
  });

  bot.command('ping', (ctx) => (ctx as MaxBotContextLike).reply('pong'));
  bot.command('status', async (ctx) => {
    const commandContext = ctx as MaxBotContextLike;
    const maxUserId = String(commandContext.user?.user_id ?? '');
    const whitelist = await getWhitelistIds();
    if (whitelist.has(maxUserId)) return commandContext.reply('✅ Вы подключены к уведомлениям.');
    return commandContext.reply('❌ Вы не подключены. Получите ссылку в админке/личном кабинете.');
  });

  bot.command('promo', async (ctx) => {
    const commandContext = ctx as MaxBotContextLike;
    const maxUserId = String(commandContext.user?.user_id ?? '');
    const whitelist = await getWhitelistIds();
    if (!whitelist.has(maxUserId))
      return commandContext.reply('Доступ только для пользователей из списка уведомлений.');
    const promos = await getPromoStats();
    if (promos.length === 0) return commandContext.reply('Нет промокодов.');
    const lines = promos.map((promo) => {
      const limit = promo.usageLimit != null ? ` / ${promo.usageLimit}` : '';
      const status = promo.isActive ? '✅' : '❌';
      return `${status} ${promo.code} — использований: ${Number(promo.usedCount) || 0}${limit}`;
    });
    return commandContext.reply(`<b>Промокоды</b>\n\n${lines.join('\n')}`);
  });

  bot.command('stats', async (ctx) => {
    const commandContext = ctx as MaxBotContextLike;
    const maxUserId = String(commandContext.user?.user_id ?? '');
    const result = await getPartnerStats(maxUserId);
    if ('error' in result) return commandContext.reply(result.error);
    if (result.stats.length === 0) return commandContext.reply('У вас пока нет статистики.');
    const totalOrders = result.stats.reduce((sum, row) => sum + row.ordersCount, 0);
    const totalIncome = result.stats.reduce((sum, row) => sum + row.partnerIncome, 0);
    const lines = result.stats.map((row) =>
      `• ${row.code} — применений: ${row.applicationsCount}, оплачено: ${row.ordersCount}, доход: ${row.partnerIncome.toFixed(0)} ₽`
    );
    return commandContext.reply(
      `<b>Ваша статистика</b>\n\nОплачено заказов: <b>${totalOrders}</b>\nВаш доход: <b>${totalIncome.toFixed(0)} ₽</b>\n\n${lines.join('\n')}`
    );
  });

  bot.on('message_created', async (ctx) => {
    const messageContext = ctx as MaxBotContextLike;
    const userId = String(messageContext.user?.user_id ?? '');
    const text = String(messageContext.message?.body?.text ?? '').trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return;
    if (!checkRateLimit(userId)) {
      await messageContext.reply('⏳ Слишком много запросов. Подождите минуту.');
      return;
    }
    if (text.startsWith('/')) return;
    await messageContext.reply('Доступные команды: /status, /promo, /stats');
  });

  bot.catch((error) => {
    console.error('[max-bot] unhandled error', error);
    process.exitCode = 1;
  });

  await bot.start();
}

bootstrap().catch((error) => {
  console.error('[max-bot] bootstrap failed', error);
  process.exit(1);
});
