import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const post = await prisma.post.findUnique({
      where: { id },
    });
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
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    if (title !== undefined && !title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = typeof body.slug === 'string' ? body.slug.trim() : undefined;
    const type = body.type === 'article' ? 'article' : body.type === 'news' ? 'news' : undefined;
    const excerpt = body.excerpt === undefined ? undefined : (typeof body.excerpt === 'string' ? body.excerpt.trim() || null : null);
    const content = body.content !== undefined ? body.content : undefined;
    const previewImage = body.previewImage === undefined ? undefined : (typeof body.previewImage === 'string' ? body.previewImage : null);
    const published = body.published === undefined ? undefined : Boolean(body.published);

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (type !== undefined) data.type = type;
    if (excerpt !== undefined) data.excerpt = excerpt;
    if (content !== undefined) data.content = content;
    if (previewImage !== undefined) data.previewImage = previewImage;
    if (published !== undefined) data.published = published;

    const post = await prisma.post.update({
      where: { id },
      data,
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    await prisma.post.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
