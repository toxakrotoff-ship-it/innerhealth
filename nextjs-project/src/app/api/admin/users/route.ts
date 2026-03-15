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
import * as partnerService from '@/services/partner.service';

const PASSWORD_LENGTH = 14;
const PASSWORD_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const VALID_ROLES = ['USER', 'WRITER', 'ADMIN', 'PARTNER'] as const;

const postUserSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  name: z.string().max(255).transform((s) => s.trim() || null).nullable().optional(),
  role: z.enum(VALID_ROLES).default('USER'),
});

function generatePassword(): string {
  const bytes = randomBytes(PASSWORD_LENGTH);
  let result = '';
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    result += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }
  return result;
}

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get('role');
  const role: Role | undefined =
    roleParam && VALID_ROLES.includes(roleParam as (typeof VALID_ROLES)[number])
      ? (roleParam as Role)
      : undefined;

  try {
    const users = await userService.getUsersForAdmin(role);
    const formatted = await Promise.all(
      users.map(async (u) => {
        const base = {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        };
        if (u.role === Role.PARTNER) {
          const [promoCodes, stats] = await Promise.all([
            partnerService.getPartnerPromoCodes(u.id),
            partnerService.getPartnerStatsByUserId(u.id),
          ]);
          const ordersCount = stats.reduce((s, x) => s + x.ordersCount, 0);
          const totalRevenue = stats.reduce((s, x) => s + x.totalAmount, 0);
          return {
            ...base,
            partnerIncomeBase: u.partnerIncomeBase === 'discount_amount' ? 'discount_amount' : 'order_total',
            promoCodes: promoCodes.map((p) => ({
              id: p.promoCodeId,
              code: p.code,
              commissionPercent: p.commissionPercent,
            })),
            ordersCount,
            totalRevenue,
          };
        }
        return base;
      })
    );
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching users:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch users';
    const hint =
      message.includes('partnerIncomeBase') || message.includes('Unknown column')
        ? ' Run: npx prisma migrate deploy'
        : '';
    return NextResponse.json(
      { error: `Failed to fetch users.${hint}`, details: process.env.NODE_ENV === 'development' ? message : undefined },
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
