import { NextResponse } from 'next/server';
import { z } from 'zod';
import { moderateReviewAndSync } from '@/lib/review-moderation-action';

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
    return NextResponse.json(
      {
        success: false,
        reason: 'unauthorized',
        message: 'Доступ только для администраторов.',
      },
      { status: 401 }
    );
  }

  const bodySchema = z.object({
    reviewId: z.string().min(1),
    status: z.enum(['APPROVED', 'REJECTED']),
  });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      {
        success: false,
        reason: 'invalid',
        message: 'Ошибка: неверные данные кнопки.',
      },
      { status: 400 }
    );
  }

  const result = await moderateReviewAndSync({
    reviewId: body.reviewId,
    status: body.status,
    channel: 'TELEGRAM',
  });
  return NextResponse.json(result, { status: result.reason === 'error' ? 500 : 200 });
}
