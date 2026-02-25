import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/require-admin';
import * as orderService from '@/services/order.service';

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const orders = await orderService.getOrdersForAdmin();
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}