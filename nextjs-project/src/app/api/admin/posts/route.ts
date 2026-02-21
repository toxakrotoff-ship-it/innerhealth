import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { slugify, slugifyUnique } from '@/lib/slugify';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
    });
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
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) {
      const baseSlug = slugify(title) || 'post';
      const existing = await prisma.post.findMany({ select: { slug: true } });
      slug = slugifyUnique(baseSlug, existing.map((p) => p.slug));
    }

    const type = body.type === 'article' ? 'article' : 'news';
    const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() || null : null;
    const content = body.content != null ? body.content : { type: 'doc', content: [] };
    const previewImage = typeof body.previewImage === 'string' ? body.previewImage : null;
    const published = Boolean(body.published);

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        type,
        excerpt,
        content,
        previewImage,
        published,
      },
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
