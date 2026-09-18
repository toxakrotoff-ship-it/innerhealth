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
 * PATCH /api/admin/reviews/[id] — смена статуса отзыва (approved/rejected) и/или названия товара.
 * Вызов с X-Service-Key (бот): только статус, только отзывы в PENDING.
 * Вызов с сессией ADMIN (админка): статус (любой) и/или productName, можно менять по отдельности.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
  }

  const isBot = isServiceRequest(request);

  if (isBot) {
    const botPatchSchema = z.object({
      status: z.enum(['approved', 'rejected']),
    });
    let body: z.infer<typeof botPatchSchema>;
    try {
      const raw = await request.json();
      body = botPatchSchema.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'status must be "approved" or "rejected"' },
        { status: 400 }
      );
    }
    const newStatus = body.status === 'approved' ? 'APPROVED' : 'REJECTED';

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

  const adminPatchSchema = z
    .object({
      status: z.enum(['approved', 'rejected']).optional(),
      productName: z.string().max(200).nullable().optional(),
    })
    .refine((data) => data.status !== undefined || data.productName !== undefined, {
      message: 'Provide status and/or productName',
    });
  let body: z.infer<typeof adminPatchSchema>;
  try {
    const raw = await request.json();
    body = adminPatchSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: 'Provide status ("approved"/"rejected") and/or productName' },
      { status: 400 }
    );
  }

  try {
    const review = await reviewService.findReviewById(id, brandId);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    const newStatus = body.status === 'approved' ? 'APPROVED' : body.status === 'rejected' ? 'REJECTED' : undefined;
    const updated = await reviewService.updateReview(id, {
      ...(newStatus ? { status: newStatus } : {}),
      ...(body.productName !== undefined ? { productName: body.productName?.trim() || null } : {}),
    });
    return NextResponse.json({ success: true, status: updated.status, productName: updated.productName });
  } catch (e) {
    console.error('PATCH review (admin) error:', e);
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
