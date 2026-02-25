import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { requireAdminSession } from '@/lib/require-admin';
import { slugify, slugifyUnique } from '@/lib/slugify';
import * as postService from '@/services/post.service';

const postPostSchema = z.object({
  title: z.string().min(1, 'Title is required').transform((s) => s.trim()),
  slug: z.string().transform((s) => s.trim()).optional(),
  type: z.enum(['article', 'news']).default('news'),
  excerpt: z.string().nullable().optional(),
  content: z.unknown().optional(),
  previewImage: z.string().nullable().optional(),
  published: z.boolean().default(false),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const posts = await postService.getPostsForAdmin();
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  let body: z.infer<typeof postPostSchema>;
  try {
    const raw = await request.json();
    body = postPostSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    let slug = body.slug ?? '';
    if (!slug) {
      const baseSlug = slugify(body.title) || 'post';
      const existingSlugs = await postService.getExistingPostSlugs();
      slug = slugifyUnique(baseSlug, existingSlugs);
    }

    const content = body.content ?? { type: 'doc', content: [] };

    const post = await postService.createPost({
      title: body.title,
      slug,
      type: body.type,
      excerpt: body.excerpt ?? null,
      content: content as Prisma.InputJsonValue,
      previewImage: body.previewImage ?? null,
      published: body.published,
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
