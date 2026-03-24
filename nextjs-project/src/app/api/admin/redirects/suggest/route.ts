import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as redirectService from '@/services/redirect.service';
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request';

const querySchema = z.object({
  sourcePath: z.string().trim().min(1).max(400),
  q: z.string().trim().max(200).optional().default(''),
  limit: z.coerce.number().int().min(1).max(30).optional().default(15),
});

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveBrandOrDefaultFromRequest(request);

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    sourcePath: searchParams.get('sourcePath') ?? '',
    q: searchParams.get('q') ?? '',
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
  }

  try {
    const items = await redirectService.suggestRedirectDestinations({
      sourcePath: parsed.data.sourcePath,
      query: parsed.data.q,
      limit: parsed.data.limit,
      brandId,
    });
    return NextResponse.json({ items, recommended: items[0] ?? null });
  } catch (error) {
    console.error('GET /api/admin/redirects/suggest', error);
    return NextResponse.json({ error: 'Не удалось получить подсказки' }, { status: 500 });
  }
}
