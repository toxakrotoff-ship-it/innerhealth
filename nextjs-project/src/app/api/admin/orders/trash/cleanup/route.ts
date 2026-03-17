import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';

export async function POST() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const now = Date.now();
  const cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.order.deleteMany({
      where: {
        deletedAt: {
          lt: cutoff,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error cleaning orders trash:', error);
    return NextResponse.json(
      { error: 'Не удалось очистить корзину заказов' },
      { status: 500 }
    );
  }
}

