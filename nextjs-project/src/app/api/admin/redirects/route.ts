import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as redirectService from '@/services/redirect.service';
import { REDIRECT_STATUS_CODES } from '@/services/redirect.service';

const createSchema = z.object({
  sourcePath: z.string().min(1, 'Укажите путь-источник'),
  destination: z.string().min(1, 'Укажите путь назначения'),
  statusCode: z.number().int().min(301).max(308).optional().default(301),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const list = await redirectService.listRedirects();
    return NextResponse.json(list);
  } catch (e) {
    console.error('GET /api/admin/redirects:', e);
    return NextResponse.json({ error: 'Failed to list redirects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { statusCode } = parsed.data;
  if (!REDIRECT_STATUS_CODES.includes(statusCode as (typeof REDIRECT_STATUS_CODES)[number])) {
    return NextResponse.json(
      { error: `statusCode must be one of ${REDIRECT_STATUS_CODES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const created = await redirectService.createRedirect(parsed.data);
    revalidateTag('redirects', 'max');
    return NextResponse.json(created);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create redirect';
    if (msg.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Редирект с таким путём-источником уже существует' },
        { status: 409 }
      );
    }
    console.error('POST /api/admin/redirects:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
