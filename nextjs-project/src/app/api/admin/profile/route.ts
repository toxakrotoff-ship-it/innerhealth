import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const NAME_MAX = 120;
const PHONE_MAX = 30;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        lastName: true,
        phone: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      email: user.email,
      firstName: user.name ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
    });
  } catch (e) {
    console.error('Profile GET error:', e);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const firstName =
      typeof body.firstName === 'string' ? body.firstName.trim().slice(0, NAME_MAX) : undefined;
    const lastName =
      typeof body.lastName === 'string' ? body.lastName.trim().slice(0, NAME_MAX) : undefined;
    const phone =
      typeof body.phone === 'string' ? body.phone.trim().slice(0, PHONE_MAX) : undefined;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(firstName !== undefined && { name: firstName || null }),
        ...(lastName !== undefined && { lastName: lastName || null }),
        ...(phone !== undefined && { phone: phone || null }),
      },
    });

    const updated = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true, lastName: true, phone: true },
    });
    return NextResponse.json({
      email: updated?.email ?? '',
      firstName: updated?.name ?? '',
      lastName: updated?.lastName ?? '',
      phone: updated?.phone ?? '',
    });
  } catch (e) {
    console.error('Profile PATCH error:', e);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
