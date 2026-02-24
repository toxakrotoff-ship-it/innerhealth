import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { sendInitialPasswordLinkEmail, getBaseUrlForEmails } from '@/lib/email';
import {
  generateSecureToken,
  hashToken,
  getLinkExpiresAt,
} from '@/lib/set-initial-password';
import { Role } from '@prisma/client';

const PASSWORD_LENGTH = 14;
const PASSWORD_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePassword(): string {
  const bytes = randomBytes(PASSWORD_LENGTH);
  let result = '';
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    result += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }
  return result;
}

function requireAdminRole() {
  return async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
  };
}

export async function GET() {
  const authError = await requireAdminRole()();
  if (authError) return authError;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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

const ROLE_VALUES: Role[] = ['USER', 'WRITER', 'ADMIN'];

export async function POST(request: Request) {
  const authError = await requireAdminRole()();
  if (authError) return authError;

  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() || null : null;
    const role = typeof body.role === 'string' && ROLE_VALUES.includes(body.role as Role)
      ? (body.role as Role)
      : 'USER';

    if (!email) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name ?? undefined,
        role,
        mustChangePassword: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const secret = generateSecureToken();
    const tokenHash = await hashToken(secret);
    const record = await prisma.setInitialPasswordToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: getLinkExpiresAt(),
      },
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
