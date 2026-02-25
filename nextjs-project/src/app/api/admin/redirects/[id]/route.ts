import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as redirectService from '@/services/redirect.service';
import { REDIRECT_STATUS_CODES } from '@/services/redirect.service';

const updateSchema = z.object({
  sourcePath: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  statusCode: z.number().int().min(301).max(308).optional(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  if (parsed.data.statusCode !== undefined && !REDIRECT_STATUS_CODES.includes(parsed.data.statusCode as (typeof REDIRECT_STATUS_CODES)[number])) {
    return NextResponse.json(
      { error: `statusCode must be one of ${REDIRECT_STATUS_CODES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const updated = await redirectService.updateRedirect(id, parsed.data);
    revalidateTag('redirects', 'max');
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Redirect not found' }, { status: 404 });
    }
    const msg = err?.message ?? 'Failed to update redirect';
    if (msg.includes('Unique constraint') || msg.includes('Unique')) {
      return NextResponse.json(
        { error: 'Редирект с таким путём-источником уже существует' },
        { status: 409 }
      );
    }
    console.error('PATCH /api/admin/redirects/[id]:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  try {
    await redirectService.deleteRedirect(id);
    revalidateTag('redirects', 'max');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Redirect not found' }, { status: 404 });
    }
    console.error('DELETE /api/admin/redirects/[id]:', e);
    return NextResponse.json({ error: 'Failed to delete redirect' }, { status: 500 });
  }
}
