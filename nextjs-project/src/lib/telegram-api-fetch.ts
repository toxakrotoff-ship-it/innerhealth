import { Agent } from 'undici';
import type { Dispatcher } from 'undici';
import { socksDispatcher } from 'fetch-socks';

export const TELEGRAM_API_HOST = 'api.telegram.org';

/**
 * Telegram «Поделиться прокси»: `tg://socks?...`, веб-ссылка с теми же query-параметрами
 * `https://t.me/socks?server=...&port=...&user=...&pass=...`, либо классический `socks5://...`.
 */
function parseTelegramShareSocksUrl(trimmed: string): {
  host: string;
  port: number;
  userId?: string;
  password?: string;
} | null {
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.searchParams.get('server')?.trim() ?? '';
  const port = Number(url.searchParams.get('port') ?? '');
  if (!host || !Number.isFinite(port) || port <= 0) return null;

  const isTgScheme = url.protocol === 'tg:' && url.hostname === 'socks';
  const path = url.pathname.replace(/\/$/, '') || '/';
  const isTmeSocks =
    (url.hostname === 't.me' || url.hostname === 'telegram.me') && path === '/socks';
  if (!isTgScheme && !isTmeSocks) return null;

  const userId = url.searchParams.get('user')?.trim() || undefined;
  const password = url.searchParams.get('pass')?.trim() || undefined;
  return { host, port, userId, password };
}

export function parseTelegramSocksProxyUrl(raw: string): {
  host: string;
  port: number;
  userId?: string;
  password?: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const shareStyle = parseTelegramShareSocksUrl(trimmed);
  if (shareStyle) return shareStyle;

  if (trimmed.startsWith('socks5://') || trimmed.startsWith('socks://')) {
    const url = new URL(trimmed);
    const host = url.hostname.trim();
    const port = Number(url.port);
    if (!host || !Number.isFinite(port) || port <= 0) return null;
    const userId = url.username ? decodeURIComponent(url.username) : undefined;
    const password = url.password ? decodeURIComponent(url.password) : undefined;
    return { host, port, userId, password };
  }
  return null;
}

let socksDispatcherCached: Agent | undefined;
let defaultAgentCached: Agent | undefined;

function getTelegramApiDispatcher(): Dispatcher {
  const raw =
    process.env.TELEGRAM_SOCKS_PROXY_URL?.trim() ||
    process.env.TELEGRAM_PROXY_SOCKS_URL?.trim() ||
    '';
  if (raw) {
    const parsed = parseTelegramSocksProxyUrl(raw);
    if (!parsed) {
      console.error(
        '[telegram-api-fetch] Invalid TELEGRAM_SOCKS_PROXY_URL / TELEGRAM_PROXY_SOCKS_URL; falling back to direct connection'
      );
    } else {
      if (!socksDispatcherCached) {
        socksDispatcherCached = socksDispatcher(
          {
            type: 5,
            host: parsed.host,
            port: parsed.port,
            ...(parsed.userId ? { userId: parsed.userId } : {}),
            ...(parsed.password ? { password: parsed.password } : {}),
          },
          {
            connect: {
              timeout: 30_000,
            },
          }
        );
      }
      return socksDispatcherCached;
    }
  }

  if (!defaultAgentCached) {
    defaultAgentCached = new Agent({
      connect: {
        timeout: 30_000,
      },
      autoSelectFamily: true,
    });
  }
  return defaultAgentCached;
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * Fetch to Telegram Bot API: uses SOCKS proxy when `TELEGRAM_SOCKS_PROXY_URL` or
 * `TELEGRAM_PROXY_SOCKS_URL` is set (Next.js site must use the same proxy as the long-poll бот
 * when `api.telegram.org` is blocked). Otherwise uses undici with `autoSelectFamily` for stable
 * direct connections.
 */
export function telegramApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const urlStr = resolveRequestUrl(input);
  if (!urlStr.includes(TELEGRAM_API_HOST)) {
    return fetch(input, init);
  }
  const dispatcher = getTelegramApiDispatcher();
  /** Node/undici accept `dispatcher`; DOM `RequestInit` typings omit it — cast for `next build` tsc. */
  return fetch(input, {
    ...init,
    dispatcher,
  } as RequestInit & { dispatcher: Dispatcher });
}
