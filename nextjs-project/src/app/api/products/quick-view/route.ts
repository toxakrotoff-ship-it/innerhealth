import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as productService from '@/services/product.service';

const querySchema = z.object({
  id: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    id: searchParams.get('id') ?? '',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректный идентификатор товара' }, { status: 400 });
  }

  const summary = await productService.getProductQuickViewSummary(parsed.data.id);
  if (!summary) {
    return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
  }

  return NextResponse.json(summary);
}
