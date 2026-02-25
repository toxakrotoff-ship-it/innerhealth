import 'server-only';
import { prisma } from '@/lib/prisma';

// --- PasswordResetToken ---

export async function createPasswordResetToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.passwordResetToken.create({
    data: {
      userId: params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
    },
  });
}

export async function findPasswordResetTokenById(id: string) {
  return prisma.passwordResetToken.findUnique({
    where: { id },
    include: { user: true },
  });
}

export async function deletePasswordResetToken(id: string) {
  return prisma.passwordResetToken.delete({ where: { id } });
}

export async function usePasswordResetTokenAndUpdateUser(
  recordId: string,
  userId: string,
  updateData: { password: string; mustChangePassword?: boolean }
) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: updateData,
    }),
    prisma.passwordResetToken.update({
      where: { id: recordId },
      data: { usedAt: new Date() },
    }),
  ]);
}

// --- SetInitialPasswordToken ---

export async function createSetInitialPasswordToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.setInitialPasswordToken.create({
    data: {
      userId: params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
    },
  });
}

export async function findSetInitialPasswordTokenById(id: string) {
  return prisma.setInitialPasswordToken.findUnique({
    where: { id },
    include: { user: true },
  });
}

export async function updateSetInitialPasswordToken(
  id: string,
  data: {
    emailCodeHash?: string | null;
    emailCodeExpiresAt?: Date | null;
    usedAt?: Date | null;
    codeVerifiedAt?: Date | null;
  }
) {
  return prisma.setInitialPasswordToken.update({
    where: { id },
    data,
  });
}

export async function useSetInitialPasswordTokenAndUpdateUser(
  recordId: string,
  userId: string,
  updateData: { password: string; mustChangePassword: boolean }
) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: updateData,
    }),
    prisma.setInitialPasswordToken.update({
      where: { id: recordId },
      data: { usedAt: new Date() },
    }),
  ]);
}
