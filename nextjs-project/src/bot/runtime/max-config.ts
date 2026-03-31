import { getMaxBotSettings } from '@/bot/runtime/settings';
import { resolveMaxBotConfig } from '@/lib/max/max-config-resolver';
import type { MaxBotConfig } from '@/lib/max/max-config-resolver';
import type { BrandId } from '@/lib/brand/brand';

export type { MaxBotConfig } from '@/lib/max/max-config-resolver';

export async function getMaxBotConfig(options?: { brandId?: BrandId | null }): Promise<MaxBotConfig> {
  const settings = await getMaxBotSettings(options ?? {});
  return resolveMaxBotConfig({
    settings,
    env: {
      MAX_BOT_TOKEN: process.env.MAX_BOT_TOKEN,
      MAX_BOT_MODE: process.env.MAX_BOT_MODE,
      MAX_BOT_WEBHOOK_URL: process.env.MAX_BOT_WEBHOOK_URL,
      MAX_BOT_WEBHOOK_SECRET: process.env.MAX_BOT_WEBHOOK_SECRET,
    },
  });
}
