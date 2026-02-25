import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import { Role } from '@prisma/client';
import * as userService from '@/services/user.service';

const patchUserSchema = z.object({
  name: z.string().max(255).transform((s) => s.trim() || null).nullable().optional(),
  role: z.enum(['USER', 'WRITER', 'ADMIN']).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 });
  }

  let body: z.infer<typeof patchUserSchema>;
  try {
    const raw = await request.json();
    body = patchUserSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const name = body.name;
    const role = body.role;

    const updateData: { name?: string | null; role?: Role } = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await userService.updateUser(id, updateData, {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 });
  }

  if (session.user.id === id) {
    return NextResponse.json(
      { error: 'Нельзя удалить свой аккаунт' },
      { status: 403 }
    );
  }

  try {
    const user = await userService.findUserByIdMinimal(id);
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    await userService.deleteUserAndDetachOrders(id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
