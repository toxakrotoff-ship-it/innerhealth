import 'server-only';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Find user by id (for session callback). */
export async function findUserById(
  id: string,
  select?: { id: true; mustChangePassword: true; name: true; lastName: true; emailVerifiedAt: true }
) {
  return prisma.user.findUnique({
    where: { id },
    select: select ?? { id: true, mustChangePassword: true, name: true, lastName: true, emailVerifiedAt: true },
  });
}

/** Find user by id for auth (authorize return shape). */
export async function findUserByIdForAuth(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePassword: true,
      emailVerifiedAt: true,
    },
  });
}

/** Find user by id for email verification flow. */
export async function findUserByIdForEmailVerification(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
    },
  });
}

/** Find user by email for email verification flow. */
export async function findUserByEmailForEmailVerification(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
    },
  });
}

/** Find user by id for 2FA setup (password, totp, method). */
export async function findUserByIdFor2fa(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      password: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      totpSecretEncrypted: true,
    },
  });
}

/** Find user by email (for login, admin create). */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

/** Update user's last login timestamp. Call after successful sign-in. */
export async function updateLastLoginAt(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

/** Get all users for admin list, optionally filtered by role. */
export async function getUsersForAdmin(role?: Role) {
  return prisma.user.findMany({
    where: role ? { role } : undefined,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      partnerIncomeBase: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Create user. */
export async function createUser(params: {
  email: string;
  password: string;
  name?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: Role;
  mustChangePassword?: boolean;
}) {
  return prisma.user.create({
    data: {
      email: params.email.trim().toLowerCase(),
      password: params.password,
      name: params.name ?? undefined,
      lastName: params.lastName ?? undefined,
      phone: params.phone ?? undefined,
      role: params.role,
      mustChangePassword: params.mustChangePassword ?? false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

/** Update user (name, role, password, 2FA, profile, etc.). */
export async function updateUser(
  id: string,
  data: {
    name?: string | null;
    lastName?: string | null;
    phone?: string | null;
    role?: Role;
    password?: string;
    mustChangePassword?: boolean;
    twoFactorEnabled?: boolean;
    twoFactorMethod?: string | null;
    totpSecretEncrypted?: string | null;
    notificationEmail?: string | null;
    emailVerifiedAt?: Date | null;
  },
  select?: { id: true; email: true; name: true; role: true; createdAt: true }
) {
  return prisma.user.update({
    where: { id },
    data,
    select: select ?? { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

/** Get admins for notifications (email, notificationEmail). */
export async function getAdminNotificationEmails() {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, notificationEmail: true },
  });
  return admins.map((a) => (a.notificationEmail?.trim() || a.email).trim()).filter(Boolean);
}

/** Delete user and nullify userId on orders. */
export async function deleteUserAndDetachOrders(userId: string) {
  return prisma.$transaction([
    prisma.order.updateMany({
      where: { userId },
      data: { userId: null },
    }),
    prisma.user.delete({
      where: { id: userId },
    }),
  ]);
}

/** Find user by id (minimal, for existence check). */
export async function findUserByIdMinimal(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
}

/** Find user profile (email, name, lastName, phone, notificationEmail) for admin profile/settings. */
export async function findUserProfile(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, lastName: true, phone: true, notificationEmail: true },
  });
}

/** Find first admin user (for telegram/settings). */
export async function findFirstAdminUser() {
  return prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });
}

/** Find user by id only if they are ADMIN. */
export async function findAdminById(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, role: 'ADMIN' },
  });
}

/** Get admins with telegram whitelist (for settings/telegram GET). */
export async function getAdminsWithTelegramWhitelist() {
  return prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      infraAlertsEnabled: true,
      telegramWhitelist: {
        select: { telegramUserId: true, linkedAt: true },
      },
    },
    orderBy: { email: 'asc' },
  });
}

/** Get admins for settings list (email, notificationEmail). */
export async function getAdminsForSettingsList() {
  return prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      notificationEmail: true,
    },
    orderBy: { email: 'asc' },
  });
}

export async function getInfraAlertTelegramChatIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { role: 'ADMIN', infraAlertsEnabled: true },
    select: { telegramWhitelist: { select: { telegramUserId: true } } },
    orderBy: { email: 'asc' },
  })
  return rows.map((r) => r.telegramWhitelist?.telegramUserId).filter((v): v is string => Boolean(v))
}

export async function updateAdminInfraAlertsEnabled(params: {
  userId: string
  infraAlertsEnabled: boolean
}): Promise<{ updated: boolean }> {
  const result = await prisma.user.updateMany({
    where: { id: params.userId, role: 'ADMIN' },
    data: { infraAlertsEnabled: params.infraAlertsEnabled },
  })
  return { updated: result.count > 0 }
}
