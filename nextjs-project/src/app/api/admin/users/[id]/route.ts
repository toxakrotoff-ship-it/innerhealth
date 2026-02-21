import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

async function requireAdminRole() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

const ROLE_VALUES: Role[] = ['USER', 'WRITER', 'ADMIN'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdminRole();
  if (authError) return authError;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'User id required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() || null : undefined;
    const role =
      typeof body.role === 'string' && ROLE_VALUES.includes(body.role as Role)
        ? (body.role as Role)
        : undefined;

    const updateData: { name?: string | null; role?: Role } = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
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
