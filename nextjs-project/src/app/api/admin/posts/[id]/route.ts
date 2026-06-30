import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { requireAdminSession } from '@/lib/require-admin';
import * as postService from '@/services/post.service';
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request';
import { sanitizeTipTapJsonForStorage } from '@/lib/sanitize-tiptap-json';
import { formatPostUpdateError } from '@/lib/post-update-error';

const putPostSchema = z.object({
  title: z.string().min(1).transform((s) => s.trim()).optional(),
  slug: z.string().transform((s) => s.trim()).optional(),
  type: z.enum(['article', 'news']).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.unknown().optional(),
  previewImage: z.string().nullable().optional(),
  published: z.boolean().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  try {
    const { id } = await context.params;
    const post = await postService.findPostById(id, brandId);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  const { id } = await context.params;

  let body: z.infer<typeof putPostSchema>;
  try {
    const raw = await request.json();
    body = putPostSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const data: Prisma.PostUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.type !== undefined) data.type = body.type;
    if (body.excerpt !== undefined) data.excerpt = body.excerpt;
    if (body.content !== undefined) data.content = sanitizeTipTapJsonForStorage(body.content);
    if (body.previewImage !== undefined) data.previewImage = body.previewImage;
    if (body.published !== undefined) data.published = body.published;

    const post = await postService.updatePost(id, data, brandId);

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    const { message, status } = formatPostUpdateError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const brandId = resolveAdminBrandFromRequest(request);

  try {
    const { id } = await context.params;
    await postService.deletePost(id, brandId);
    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
