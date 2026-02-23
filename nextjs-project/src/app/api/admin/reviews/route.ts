import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

/** GET: список всех отзывов для модерации (статус отображается; при смене в боте — обновляется при обновлении страницы/списка). */
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        authorName: true,
        socialLink: true,
        text: true,
        imageUrl: true,
        status: true,
        createdAt: true,
      },
    });
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
