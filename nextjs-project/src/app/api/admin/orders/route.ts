import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as orderService from '@/services/order.service';
import { resolveBrandFromRequest } from '@/lib/brand/brand-request';

const querySchema = z.object({
  mode: z.enum(['active', 'trash']).optional(),
});

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandFromRequest(request);

  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      mode: url.searchParams.get('mode') ?? undefined,
    });

    const mode: 'active' | 'trash' =
      parsed.success && parsed.data.mode ? parsed.data.mode : 'active';

    const orders = await orderService.getOrdersForAdminWithTrash({ mode, brandId });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}