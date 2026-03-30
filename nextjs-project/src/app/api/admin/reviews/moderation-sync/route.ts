import { NextResponse } from 'next/server';
import { z } from 'zod';
import { syncReviewModerationMessages } from '@/lib/review-moderation-sync';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

export async function POST(request: Request) {
  if (!isServiceRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bodySchema = z.object({
    reviewId: z.string().min(1),
    status: z.enum(['APPROVED', 'REJECTED']),
  });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await syncReviewModerationMessages({ reviewId: body.reviewId, status: body.status });
  return NextResponse.json({ ok: true });
}

