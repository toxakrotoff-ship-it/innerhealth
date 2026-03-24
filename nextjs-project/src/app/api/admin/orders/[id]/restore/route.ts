import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/require-admin';
import * as orderService from '@/services/order.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: unknown }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandOrDefaultFromRequest(request);

  const parsedParams = paramsSchema.safeParse(context.params);
  if (!parsedParams.success) {
    return NextResponse.json(
      { error: 'Некорректный ID заказа' },
      { status: 400 }
    );
  }

  const { id } = parsedParams.data;

  try {
    const order = await orderService.getOrderDetailForAdmin(id, brandId);
    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден в выбранном бренде' },
        { status: 404 }
      );
    }

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

