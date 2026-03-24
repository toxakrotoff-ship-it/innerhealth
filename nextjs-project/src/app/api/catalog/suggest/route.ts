import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as productService from '@/services/product.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';

const querySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

export async function GET(request: NextRequest) {
  const brandId = resolveBrandOrDefaultFromRequest(request);
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get('q') ?? '',
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректный поисковый запрос' }, { status: 400 });
  }

  const suggestions = await productService.suggestProducts(
    parsed.data.q,
    parsed.data.limit ?? 8,
    brandId
  );
  return NextResponse.json(suggestions);
}
