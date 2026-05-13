import type { MaxMenuCommand } from '@/lib/max-bot-menu';

/** Hex/link codes from createMaxLinkCode — same rule as scripts/max-bot.ts */
export const MAX_LINK_CODE_MAX_LENGTH = 64;
export const MAX_LINK_CODE_REGEX = /^[a-zA-Z0-9]+$/;

/**
 * MAX (как Telegram): `/start`, `/start@Bot`, `/start <code>` из чата.
 */
export function parseSlashStart(text: string): { code: string | null } | null {
  const t = text.trim();
  const match = t.match(/^\/start(?:@[^\s]+)?(?:\s+(.+))?$/i);
  if (!match) return null;
  const raw = match[1]?.trim();
  if (!raw) return { code: null };
  return { code: raw.slice(0, MAX_LINK_CODE_MAX_LENGTH) };
}

export function isSlashHelp(text: string): boolean {
  return /^\/help(?:@[^\s]+)?$/i.test(text.trim());
}

export function parseSimpleMaxSlashCommand(text: string): MaxMenuCommand | null {
  const t = text.trim();
  if (/^\/status(?:@[^\s]+)?$/i.test(t)) return 'status';
  if (/^\/promo(?:@[^\s]+)?$/i.test(t)) return 'promo';
  if (/^\/stats(?:@[^\s]+)?$/i.test(t)) return 'stats';
  return null;
}
