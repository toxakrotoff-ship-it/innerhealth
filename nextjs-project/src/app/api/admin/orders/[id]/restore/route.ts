import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function POST(
  _request: Request,
  context: { params: unknown }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: 'Некорректный ID заказа' },
      { status: 400 }
    );
  }

  const { id } = parsedParams.data;

  try {
    const updated = await prisma.order.updateMany({
      where: {
        id,
        deletedAt: { not: null },
      },
      data: {
        deletedAt: null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: 'Заказ не найден или не в корзине' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring order from trash:', error);
    return NextResponse.json(
      { error: 'Не удалось восстановить заказ' },
      { status: 500 }
    );
  }
}

