import 'server-only';
import { prisma } from '@/lib/prisma';

/** Get all Telegram whitelist entries. */
export async function getTelegramWhitelist() {
  return prisma.telegramWhitelist.findMany({
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

/** Find whitelist by telegramUserId. */
export async function findTelegramWhitelistByTelegramUserId(telegramUserId: string) {
  return prisma.telegramWhitelist.findUnique({
    where: { telegramUserId },
  });
}

/** Find whitelist by userId. */
export async function findTelegramWhitelistByUserId(userId: string) {
  return prisma.telegramWhitelist.findUnique({
    where: { userId },
  });
}

/** Find whitelist by userId (select telegramUserId, linkedAt) for status. */
export async function findTelegramWhitelistStatusByUserId(userId: string) {
  return prisma.telegramWhitelist.findUnique({
    where: { userId },
    select: { telegramUserId: true, linkedAt: true },
  });
}

/** Delete all whitelist entries for a user (before re-linking). */
export async function deleteTelegramWhitelistByUserId(userId: string) {
  return prisma.telegramWhitelist.deleteMany({
    where: { userId },
  });
}

/** Create TelegramLinkCode. */
export async function createTelegramLinkCode(params: {
  code: string;
  userId: string;
  expiresAt: Date;
}) {
  return prisma.telegramLinkCode.create({
    data: {
      code: params.code,
      userId: params.userId,
      expiresAt: params.expiresAt,
    },
  });
}

/** Find TelegramLinkCode by code. */
export async function findTelegramLinkCodeByCode(code: string) {
  return prisma.telegramLinkCode.findUnique({
    where: { code },
  });
}

/** Delete TelegramLinkCode by code. */
export async function deleteTelegramLinkCodeByCode(code: string) {
  return prisma.telegramLinkCode.delete({ where: { code } }).catch(() => {});
}

/** Find link code by code (select userId, expiresAt). */
export async function findTelegramLinkCodeForConfirm(code: string) {
  return prisma.telegramLinkCode.findUnique({
    where: { code },
    select: { userId: true, expiresAt: true },
  });
}

/** Confirm link: delete code and upsert whitelist in transaction. Returns userId or null. */
export async function confirmTelegramLinkAndReturnUserId(
  code: string,
  telegramUserId: string
): Promise<string | null> {
  const linkRecord = await findTelegramLinkCodeForConfirm(code);
  if (!linkRecord || new Date() > linkRecord.expiresAt) return null;
  await prisma.$transaction(async (tx) => {
    await tx.telegramLinkCode.delete({ where: { code } });
    await tx.telegramWhitelist.upsert({
      where: { userId: linkRecord.userId },
      create: { userId: linkRecord.userId, telegramUserId },
      update: { telegramUserId, linkedAt: new Date() },
    });
  });
  return linkRecord.userId;
}
