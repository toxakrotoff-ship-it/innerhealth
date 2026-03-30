import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { getMaxBotConfig } from '@/lib/max/max-config';
import { notifyMaxConnection } from '@/lib/max-notify';
import * as maxService from '@/services/max.service';

const maxWebhookUpdateSchema = z.object({
  update_type: z.string(),
  chat_id: z.union([z.number(), z.string()]).optional(),
  payload: z.string().nullable().optional(),
  user: z
    .object({
      user_id: z.union([z.number(), z.string()]),
    })
    .optional(),
});

const VALID_CODE_REGEX = /^[a-zA-Z0-9]+$/;
const MAX_START_CODE_LENGTH = 64;

function isSecureRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const proto = request.headers.get('x-forwarded-proto');
  return proto === 'https';
}

export async function POST(request: Request) {
  if (!isSecureRequest(request))
    return NextResponse.json({ error: 'HTTPS required' }, { status: 403 });

  const identifier = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(identifier, 'webhook:max', 30, 60_000);
  if (!rateLimit.success)
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const config = await getMaxBotConfig();
  const webhookSecret = config.webhookSecret;
  if (webhookSecret) {
    // MAX sends this header when `secret` is set on subscription.
    // Docs name: X-Max-Bot-Api-Secret
    const requestSecret = request.headers.get('x-max-bot-api-secret')?.trim();
    if (!requestSecret || requestSecret !== webhookSecret)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = maxWebhookUpdateSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  if (parsed.data.update_type === 'bot_started') {
    const codeRaw = parsed.data.payload ?? '';
    const safeCode = codeRaw.slice(0, MAX_START_CODE_LENGTH);
    const maxUserId = parsed.data.user?.user_id !== undefined ? String(parsed.data.user.user_id) : '';
    if (safeCode && VALID_CODE_REGEX.test(safeCode) && maxUserId) {
      const userId = await maxService.confirmMaxLinkAndReturnUserId(safeCode, maxUserId);
      if (userId) void notifyMaxConnection({ userId, maxUserId });
    }
  }

  return NextResponse.json({ ok: true });
}
