import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as reviewService from '@/services/review.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';

/** GET: список всех отзывов для модерации (статус отображается; при смене в боте — обновляется при обновлении страницы/списка). */
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandOrDefaultFromRequest(request);

  try {
    const reviews = await reviewService.getReviewsForAdmin(brandId);
    const serialized = reviews.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json(serialized);
  } catch (e) {
    console.error('GET admin reviews error:', e);
    return NextResponse.json(
      { error: 'Не удалось загрузить отзывы' },
      { status: 500 }
    );
  }
}
