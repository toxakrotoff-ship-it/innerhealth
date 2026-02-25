import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/require-admin';
import { hashPassword } from '@/lib/password';
import { sendInitialPasswordLinkEmail, getBaseUrlForEmails } from '@/lib/email';
import {
  generateSecureToken,
  hashToken,
  getLinkExpiresAt,
} from '@/lib/set-initial-password';
import { Role } from '@prisma/client';
import * as userService from '@/services/user.service';
import * as authTokensService from '@/services/auth-tokens.service';

const PASSWORD_LENGTH = 14;
const PASSWORD_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const ROLE_VALUES: Role[] = ['USER', 'WRITER', 'ADMIN'];

const postUserSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  name: z.string().max(255).transform((s) => s.trim() || null).nullable().optional(),
  role: z.enum(['USER', 'WRITER', 'ADMIN']).default('USER'),
});

function generatePassword(): string {
  const bytes = randomBytes(PASSWORD_LENGTH);
  let result = '';
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    result += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }
  return result;
}

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const users = await userService.getUsersForAdmin();
    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    }));
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  let body: z.infer<typeof postUserSchema>;
  try {
    const raw = await request.json();
    body = postUserSchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((e) => e.message).join('; ') : 'Invalid payload';
    return NextResponse.json({ error: msg || 'Email обязателен' }, { status: 400 });
  }

  const { email, name, role } = body;

  try {

    const existing = await userService.findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);
    const user = await userService.createUser({
      email,
      password: hashedPassword,
      name: name ?? undefined,
      role: role as Role,
      mustChangePassword: true,
    });

    const secret = generateSecureToken();
    const tokenHash = await hashToken(secret);
    const record = await authTokensService.createSetInitialPasswordToken({
      userId: user.id,
      tokenHash,
      expiresAt: getLinkExpiresAt(),
    });

    const baseUrl = getBaseUrlForEmails(request);
    const link = `${baseUrl}/login/set-initial-password?token=${encodeURIComponent(record.id + '.' + secret)}`;
    const emailResult = await sendInitialPasswordLinkEmail(user.email, link);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? undefined : emailResult.error,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
