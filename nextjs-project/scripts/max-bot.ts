import 'dotenv/config';
import { Bot } from '@maxhub/max-bot-api';
import {
  getMaxBotUserCapabilities,
  type BotUserCapabilities,
} from '@/bot/runtime/capabilities';
import { getMaxBotConfig } from '@/bot/runtime/max-config';
import { getPromoStatsForAdmin } from '@/bot/runtime/promo-stats';
import { getPartnerStatsByMaxUserId } from '@/bot/runtime/partner-stats';
import { normalizeBrandId, type BrandId } from '@/lib/brand/brand';
import {
  buildHelpTextForMax,
  buildMaxMenuAttachments,
  buildUnknownCommandTextForMax,
  buildWelcomeTextForMax,
  resolveMaxMenuCommand,
  type MaxMenuCommand,
} from '@/lib/max-bot-menu';

const FETCH_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_USER = 20;
const MAX_MESSAGE_LENGTH = 500;
const MAX_START_CODE_LENGTH = 64;
const VALID_CODE_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_SERVICE_SECRET = process.env.MAX_SERVICE_SECRET;
const MAX_BOT_BRAND_ID: BrandId = normalizeBrandId(process.env.MAX_BOT_BRAND_ID) ?? 'inner';
const MAX_SITE_URL =
  process.env.MAX_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

interface MaxBotContextLike {
  user?: { user_id?: string | number };
  message?: { body?: { text?: string | null } | null } | null;
  callback?: { payload?: string | null } | null;
  reply: (
    text: string,
    extra?: { format?: 'markdown' | 'html'; attachments?: unknown[] }
  ) => Promise<unknown> | unknown;
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

/**
 * MAX (как Telegram) присылает не только `/start`, но и `/start@BotUsername`.
 * Раньше проверяли только точное равенство `/start`, из‑за чего бот молчал.
 * Опционально: второй токен после пробела — код привязки (как в Telegram).
 */
function parseSlashStart(text: string): { code: string | null } | null {
  const t = text.trim();
  const match = t.match(/^\/start(?:@[^\s]+)?(?:\s+(.+))?$/i);
  if (!match) return null;
  const raw = match[1]?.trim();
  if (!raw) return { code: null };
  return { code: raw.slice(0, MAX_START_CODE_LENGTH) };
}

function isSlashHelp(text: string): boolean {
  return /^\/help(?:@[^\s]+)?$/i.test(text.trim());
}

/** Команды без аргументов в том же формате `/cmd@Bot`. */
function parseSimpleMaxSlashCommand(text: string): MaxMenuCommand | null {
  const t = text.trim();
  if (/^\/status(?:@[^\s]+)?$/i.test(t)) return 'status';
  if (/^\/promo(?:@[^\s]+)?$/i.test(t)) return 'promo';
  if (/^\/stats(?:@[^\s]+)?$/i.test(t)) return 'stats';
  return null;
}

async function confirmLink(code: string, maxUserId: string): Promise<{ success?: boolean; error?: string }> {
  if (!MAX_SERVICE_SECRET) return { error: 'MAX_SERVICE_SECRET is missing' };
  try {
    const base = MAX_SITE_URL.replace(/\/$/, '');
    const brandQuery = `?brand=${encodeURIComponent(MAX_BOT_BRAND_ID)}`;
    const res = await fetchWithTimeout(`${base}/api/admin/max/confirm${brandQuery}`, {
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

async function executeMaxCommand(
  ctx: MaxBotContextLike,
  maxUserId: string,
  command: MaxMenuCommand
): Promise<void> {
  const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId: MAX_BOT_BRAND_ID });
  const attachments = buildMaxMenuAttachments(capabilities) as unknown[];

  if (command === 'help') {
    await ctx.reply(buildHelpTextForMax(capabilities), { format: 'markdown', attachments });
    return;
  }
  if (command === 'status') {
    await ctx.reply(
      capabilities.isLinked
        ? '✅ Вы подключены к уведомлениям.'
        : '❌ Вы не подключены. Получите ссылку в админке/личном кабинете.',
      { format: 'markdown', attachments }
    );
    return;
  }
  if (command === 'promo') {
    if (!capabilities.isAdmin) {
      await ctx.reply('Доступ только для администраторов.', { format: 'markdown', attachments });
      return;
    }
    const promos = await getPromoStatsForAdmin(MAX_BOT_BRAND_ID);
    if (promos.length === 0) {
      await ctx.reply('Нет промокодов.', { format: 'markdown', attachments });
      return;
    }
    const lines = promos.map((promo) => {
      const limit = promo.usageLimit != null ? ` / ${promo.usageLimit}` : '';
      const status = promo.isActive ? '✅' : '❌';
      return `${status} ${promo.code} — использований: ${Number(promo.usedCount) || 0}${limit}`;
    });
    await ctx.reply(`<b>Промокоды</b>\n\n${lines.join('\n')}`, { format: 'html', attachments });
    return;
  }
  if (!capabilities.isPartner) {
    await ctx.reply('Доступ только для партнёров.', { format: 'markdown', attachments });
    return;
  }
  const stats = await getPartnerStatsByMaxUserId(maxUserId, MAX_BOT_BRAND_ID);
  if (stats === null) {
    await ctx.reply('Доступ только для партнёров.', { format: 'markdown', attachments });
    return;
  }
  if (stats.length === 0) {
    await ctx.reply('У вас пока нет статистики.', { format: 'markdown', attachments });
    return;
  }
  const totalOrders = stats.reduce((sum, row) => sum + row.ordersCount, 0);
  const lines = stats.map((row) => `• ${row.code} — заказов: ${row.ordersCount}`);
  await ctx.reply(`<b>Ваша статистика</b>\n\nВсего заказов: <b>${totalOrders}</b>\n\n${lines.join('\n')}`, {
    format: 'html',
    attachments,
  });
}

async function bootstrap(): Promise<void> {
  const config = await getMaxBotConfig({ brandId: MAX_BOT_BRAND_ID });
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
      return confirmLink(safeCode, maxUserId).then(async (result) => {
        if (result.success) {
          const capabilities = await getMaxBotUserCapabilities(maxUserId, { brandId: MAX_BOT_BRAND_ID });
          return botStartedContext.reply(buildWelcomeTextForMax(capabilities), {
            format: 'markdown',
            attachments: buildMaxMenuAttachments(capabilities) as unknown[],
          });
        }
        return botStartedContext.reply(result.error || 'Не удалось привязать. Попробуйте снова.');
      });
    }
    return botStartedContext.reply('Используйте ссылку из админки, чтобы подключить уведомления.');
  });

  bot.command('ping', (ctx) => (ctx as MaxBotContextLike).reply('pong'));
  bot.command('help', async (ctx) => {
    const commandContext = ctx as MaxBotContextLike;
    return executeMaxCommand(commandContext, String(commandContext.user?.user_id ?? ''), 'help');
  });
  bot.command('status', async (ctx) => {
    const commandContext = ctx as MaxBotContextLike;
    return executeMaxCommand(commandContext, String(commandContext.user?.user_id ?? ''), 'status');
  });
  bot.command('promo', async (ctx) => {
    const commandContext = ctx as MaxBotContextLike;
    return executeMaxCommand(commandContext, String(commandContext.user?.user_id ?? ''), 'promo');
  });
  bot.command('stats', async (ctx) => {
    const commandContext = ctx as MaxBotContextLike;
    return executeMaxCommand(commandContext, String(commandContext.user?.user_id ?? ''), 'stats');
  });

  bot.on('message_callback', async (ctx) => {
    const callbackContext = ctx as MaxBotContextLike;
    const payload = String(callbackContext.callback?.payload ?? '').trim();
    const command = resolveMaxMenuCommand(payload);
    if (!command) return;
    await executeMaxCommand(callbackContext, String(callbackContext.user?.user_id ?? ''), command);
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
    if (isSlashHelp(text)) {
      await executeMaxCommand(messageContext, userId, 'help');
      return;
    }

    const startParts = parseSlashStart(text);
    if (startParts) {
      if (startParts.code) {
        const safeCode = startParts.code;
        if (!VALID_CODE_REGEX.test(safeCode)) {
          await messageContext.reply('Неверный формат кода. Используйте ссылку из личного кабинета.');
          return;
        }
        const result = await confirmLink(safeCode, userId);
        if (result.success) {
          const capabilities = await getMaxBotUserCapabilities(userId, { brandId: MAX_BOT_BRAND_ID });
          await messageContext.reply(buildWelcomeTextForMax(capabilities), {
            format: 'markdown',
            attachments: buildMaxMenuAttachments(capabilities) as unknown[],
          });
          return;
        }
        await messageContext.reply(result.error || 'Не удалось привязать. Попробуйте снова.');
        return;
      }
      const capabilities = await getMaxBotUserCapabilities(userId, { brandId: MAX_BOT_BRAND_ID });
      await messageContext.reply(
        'Чтобы подключить уведомления, откройте **ссылку из личного кабинета** (кнопка «Подключить MAX») — в ней уже есть ваш код. Просто команда /start без этой ссылки не привязывает аккаунт.',
        { format: 'markdown', attachments: buildMaxMenuAttachments(capabilities) as unknown[] }
      );
      return;
    }

    const simpleCmd = parseSimpleMaxSlashCommand(text);
    if (simpleCmd) {
      await executeMaxCommand(messageContext, userId, simpleCmd);
      return;
    }

    if (text.startsWith('/')) return;
    const capabilities: BotUserCapabilities = await getMaxBotUserCapabilities(userId, {
      brandId: MAX_BOT_BRAND_ID,
    });
    await messageContext.reply(buildUnknownCommandTextForMax(capabilities), {
      format: 'markdown',
      attachments: buildMaxMenuAttachments(capabilities) as unknown[],
    });
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
