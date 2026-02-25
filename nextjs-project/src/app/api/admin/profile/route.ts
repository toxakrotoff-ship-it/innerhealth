import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import * as userService from '@/services/user.service';

const NAME_MAX = 120;
const PHONE_MAX = 30;

const patchProfileSchema = z.object({
  firstName: z.string().max(NAME_MAX).transform((s) => s.trim()).optional(),
  lastName: z.string().max(NAME_MAX).transform((s) => s.trim()).optional(),
  phone: z.string().max(PHONE_MAX).transform((s) => s.trim()).optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const profileUser = await userService.findUserProfile(session.user.id as string);
    if (!profileUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      email: profileUser.email,
      firstName: profileUser.name ?? '',
      lastName: profileUser.lastName ?? '',
      phone: profileUser.phone ?? '',
    });
  } catch (e) {
    console.error('Profile GET error:', e);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  let body: z.infer<typeof patchProfileSchema>;
  try {
    const raw = await request.json();
    body = patchProfileSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const firstName = body.firstName;
    const lastName = body.lastName;
    const phone = body.phone;

    await userService.updateUser(session.user.id, {
      ...(firstName !== undefined && { name: firstName || null }),
      ...(lastName !== undefined && { lastName: lastName || null }),
      ...(phone !== undefined && { phone: phone || null }),
    });

    const updated = await userService.findUserProfile(session.user.id);
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
