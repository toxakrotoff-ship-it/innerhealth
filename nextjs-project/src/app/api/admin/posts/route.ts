import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeTipTapJsonForStorage } from '@/lib/sanitize-tiptap-json';
import { requireAdminSession } from '@/lib/require-admin';
import { slugify, slugifyUnique } from '@/lib/slugify';
import * as postService from '@/services/post.service';
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request';

const postPostSchema = z.object({
  title: z.string().min(1, 'Title is required').transform((s) => s.trim()),
  slug: z.string().transform((s) => s.trim()).optional(),
  type: z.enum(['article', 'news']).default('news'),
  excerpt: z.string().nullable().optional(),
  content: z.unknown().optional(),
  previewImage: z.string().nullable().optional(),
  published: z.boolean().default(false),
});

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  try {
    const posts = await postService.getPostsForAdmin(brandId);
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
  const brandId = resolveAdminBrandFromRequest(request);

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
      const existingSlugs = await postService.getExistingPostSlugs(brandId);
      slug = slugifyUnique(baseSlug, existingSlugs);
    }

    const content = sanitizeTipTapJsonForStorage(body.content ?? { type: 'doc', content: [] });

    const post = await postService.createPost({
      title: body.title,
      slug,
      type: body.type,
      excerpt: body.excerpt ?? null,
      content,
      previewImage: body.previewImage ?? null,
      published: body.published,
    }, brandId);

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
