import { describe, expect, it } from 'vitest';
import { resolveMaxBotConfig } from '@/lib/max/max-config-resolver';

describe('resolveMaxBotConfig', () => {
  it('prefers admin token and webhook mode over env', () => {
    const config = resolveMaxBotConfig({
      settings: {
        token: 'admin-token',
        mode: 'webhook',
        webhookUrl: 'https://example.com/api/webhooks/max',
        webhookSecret: 'admin-secret',
      },
      env: {
        MAX_BOT_TOKEN: 'env-token',
        MAX_BOT_MODE: 'polling',
      },
    });

    expect(config).toEqual({
      token: 'admin-token',
      mode: 'webhook',
      webhookUrl: 'https://example.com/api/webhooks/max',
      webhookSecret: 'admin-secret',
    });
  });

  it('falls back to env and defaults mode to polling', () => {
    const config = resolveMaxBotConfig({
      settings: {},
      env: {
        MAX_BOT_TOKEN: 'env-token',
        MAX_BOT_MODE: 'unknown',
      },
    });

    expect(config).toEqual({
      token: 'env-token',
      mode: 'polling',
      webhookUrl: undefined,
      webhookSecret: undefined,
    });
  });
});
