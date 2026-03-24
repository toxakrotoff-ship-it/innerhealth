import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as reviewService from '@/services/review.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}


type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/reviews/[id] — смена статуса отзыва (approved/rejected).
 * Вызов с X-Service-Key (бот): только отзывы в PENDING.
 * Вызов с сессией ADMIN (админка): любой статус можно сменить на approved/rejected.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
  }

  const patchReviewSchema = z.object({
    status: z.enum(['approved', 'rejected']),
  });
  let body: z.infer<typeof patchReviewSchema>;
  try {
    const raw = await request.json();
    body = patchReviewSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: 'status must be "approved" or "rejected"' },
      { status: 400 }
    );
  }

  const newStatus = body.status === 'approved' ? 'APPROVED' : 'REJECTED';

  const isBot = isServiceRequest(request);

  if (isBot) {
    try {
      const review = await reviewService.findReviewById(id);
      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 });
      }
      if (review.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Review already moderated' },
          { status: 400 }
        );
      }
      await reviewService.updateReview(id, { status: newStatus });
      return NextResponse.json({ success: true, status: newStatus });
    } catch (e) {
      console.error('PATCH review status (bot) error:', e);
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
    }
  }

  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandOrDefaultFromRequest(request);

  try {
    const review = await reviewService.findReviewById(id, brandId);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    await reviewService.updateReview(id, { status: newStatus });
    return NextResponse.json({ success: true, status: newStatus });
  } catch (e) {
    console.error('PATCH review status (admin) error:', e);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

/** DELETE /api/admin/reviews/[id] — удалить отзыв. Только для ADMIN по сессии. */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandOrDefaultFromRequest(request);

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
  }

  try {
    const review = await reviewService.findReviewById(id, brandId);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    await reviewService.deleteReview(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE review error:', e);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
