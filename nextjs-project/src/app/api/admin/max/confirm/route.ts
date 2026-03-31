import { NextResponse } from 'next/server';
import { z } from 'zod';
import { confirmMaxLinkAndReturnUserId } from '@/bot/runtime/max-links';
import { notifyMaxConnection } from '@/lib/max-notify';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'MAX_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

export async function POST(request: Request) {
  if (!isServiceRequest(request))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const bodySchema = z.object({
    code: z.string().min(1).transform((value) => value.trim()),
    maxUserId: z.string().min(1).transform((value) => value.trim()),
  });
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues.map((item) => item.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await confirmMaxLinkAndReturnUserId(body.code, body.maxUserId);
    if (!result)
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });

    void notifyMaxConnection({
      userId: result.userId,
      maxUserId: body.maxUserId,
      brandId: result.brandId,
    });
    return NextResponse.json({ success: true, message: 'Вы добавлены в список уведомлений' });
  } catch (error) {
    console.error('MAX confirm error:', error);
    return NextResponse.json({ error: 'Failed to confirm' }, { status: 500 });
  }
}
