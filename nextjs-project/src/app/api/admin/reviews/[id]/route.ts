import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SERVICE_HEADER = 'x-service-key';
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET';

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV];
  if (!secret || typeof secret !== 'string') return false;
  const key = request.headers.get(SERVICE_HEADER);
  return key === secret;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
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

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawStatus = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
  if (rawStatus !== 'approved' && rawStatus !== 'rejected') {
    return NextResponse.json(
      { error: 'status must be "approved" or "rejected"' },
      { status: 400 }
    );
  }

  const newStatus = rawStatus === 'approved' ? 'APPROVED' : 'REJECTED';

  const isBot = isServiceRequest(request);

  if (isBot) {
    try {
      const review = await prisma.review.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 });
      }
      if (review.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Review already moderated' },
          { status: 400 }
        );
      }
      await prisma.review.update({
        where: { id },
        data: { status: newStatus },
      });
      return NextResponse.json({ success: true, status: newStatus });
    } catch (e) {
      console.error('PATCH review status (bot) error:', e);
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
    }
  }

  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    await prisma.review.update({
      where: { id },
      data: { status: newStatus },
    });
    return NextResponse.json({ success: true, status: newStatus });
  } catch (e) {
    console.error('PATCH review status (admin) error:', e);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

/** DELETE /api/admin/reviews/[id] — удалить отзыв. Только для ADMIN по сессии. */
export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing review id' }, { status: 400 });
  }

  try {
    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE review error:', e);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
