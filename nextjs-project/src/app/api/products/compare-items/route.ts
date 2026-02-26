import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as productService from '@/services/product.service';

const querySchema = z.object({
  ids: z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )
    .refine((ids) => ids.length > 0 && ids.length <= 6, 'Количество товаров для сравнения: от 1 до 6'),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    ids: searchParams.get('ids') ?? '',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректный список товаров для сравнения' }, { status: 400 });
  }

  const products = await productService.getProductsForCompare(parsed.data.ids);
  return NextResponse.json(products);
}
