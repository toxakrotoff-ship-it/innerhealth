import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as postService from '@/services/post.service';
import * as categoryService from '@/services/category.service';

const querySchema = z.object({
  q: z.string().max(200).optional().default(''),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get('q') ?? '',
    limit: searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const { q, limit } = parsed.data;

  try {
    const [posts, categories] = await Promise.all([
      postService.suggestPostsForLink(q, limit),
      categoryService.suggestCategoriesForLink(q, limit),
    ]);
    return NextResponse.json({ posts, categories });
  } catch (error) {
    console.error('content-link-suggest', error);
    return NextResponse.json({ error: 'Failed to suggest' }, { status: 500 });
  }
}
