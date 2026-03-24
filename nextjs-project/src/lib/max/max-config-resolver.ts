import { z } from 'zod';

export interface MaxBotConfig {
  token?: string;
  mode: 'polling' | 'webhook';
  webhookUrl?: string;
  webhookSecret?: string;
}

interface ResolveMaxBotConfigInput {
  settings: Partial<MaxBotConfig>;
  env: Partial<Record<'MAX_BOT_TOKEN' | 'MAX_BOT_MODE' | 'MAX_BOT_WEBHOOK_URL' | 'MAX_BOT_WEBHOOK_SECRET', string>>;
}

const maxBotModeSchema = z.enum(['polling', 'webhook']);

export function resolveMaxBotConfig(input: ResolveMaxBotConfigInput): MaxBotConfig {
  const token = input.settings.token?.trim() || input.env.MAX_BOT_TOKEN?.trim() || undefined;
  const modeCandidate = (input.settings.mode || input.env.MAX_BOT_MODE || '').trim().toLowerCase();
  const mode = maxBotModeSchema.safeParse(modeCandidate).success
    ? (modeCandidate as 'polling' | 'webhook')
    : 'polling';
  const webhookUrl = input.settings.webhookUrl?.trim() || input.env.MAX_BOT_WEBHOOK_URL?.trim() || undefined;
  const webhookSecret =
    input.settings.webhookSecret?.trim() || input.env.MAX_BOT_WEBHOOK_SECRET?.trim() || undefined;

  return { token, mode, webhookUrl, webhookSecret };
}
