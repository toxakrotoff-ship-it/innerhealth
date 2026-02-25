import { NextResponse } from 'next/server';
import { z } from 'zod';
import { notifyTelegramConnection } from '@/lib/telegram-notify';
import * as telegramService from '@/services/telegram.service';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

/** POST: подтвердить привязку по коду и telegramUserId. Вызывается ботом с X-Service-Key. */
export async function POST(request: Request) {
  if (!isServiceRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bodySchema = z.object({
    code: z.string().min(1, 'Missing code').transform((s) => s.trim()),
    telegramUserId: z.string().min(1, 'Missing telegramUserId').transform((s) => s.trim()),
  });
  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    body = bodySchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { code, telegramUserId } = body;

  try {
    const userId = await telegramService.confirmTelegramLinkAndReturnUserId(code, telegramUserId);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    void notifyTelegramConnection({
      userId,
      telegramUserId,
    });

    return NextResponse.json({ success: true, message: 'Вы добавлены в список уведомлений' });
  } catch (e) {
    console.error('Telegram confirm error:', e);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
