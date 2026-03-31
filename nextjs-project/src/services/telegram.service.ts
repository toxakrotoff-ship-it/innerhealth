import 'server-only';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';

interface ScopeOptions {
  brandId?: BrandId | null;
}

/** Get all Telegram whitelist entries. */
export async function getTelegramWhitelist(options: ScopeOptions = {}) {
  return prisma.telegramWhitelist.findMany({
    where: { brand: resolveDbBrand(options.brandId) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

/** Find whitelist by telegramUserId. */
export async function findTelegramWhitelistByTelegramUserId(
  telegramUserId: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramWhitelist.findUnique({
    where: {
      brand_telegramUserId: {
        brand: resolveDbBrand(options.brandId),
        telegramUserId,
      },
    },
  });
}

/** Find whitelist by userId. */
export async function findTelegramWhitelistByUserId(
  userId: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramWhitelist.findUnique({
    where: {
      brand_userId: {
        brand: resolveDbBrand(options.brandId),
        userId,
      },
    },
  });
}

/** Find whitelist by userId (select telegramUserId, linkedAt) for status. */
export async function findTelegramWhitelistStatusByUserId(
  userId: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramWhitelist.findUnique({
    where: {
      brand_userId: {
        brand: resolveDbBrand(options.brandId),
        userId,
      },
    },
    select: { telegramUserId: true, linkedAt: true },
  });
}

/** Delete all whitelist entries for a user (before re-linking). */
export async function deleteTelegramWhitelistByUserId(
  userId: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramWhitelist.deleteMany({
    where: { brand: resolveDbBrand(options.brandId), userId },
  });
}

/** Create TelegramLinkCode. */
export async function createTelegramLinkCode(params: {
  code: string;
  userId: string;
  expiresAt: Date;
  brandId?: BrandId | null;
}) {
  return prisma.telegramLinkCode.create({
    data: {
      brand: resolveDbBrand(params.brandId),
      code: params.code,
      userId: params.userId,
      expiresAt: params.expiresAt,
    },
  });
}

/** Find TelegramLinkCode by code. */
export async function findTelegramLinkCodeByCode(
  code: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramLinkCode.findUnique({
    where: {
      brand_code: {
        brand: resolveDbBrand(options.brandId),
        code,
      },
    },
  });
}

/** Delete TelegramLinkCode by code. */
export async function deleteTelegramLinkCodeByCode(
  code: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramLinkCode
    .delete({
      where: {
        brand_code: {
          brand: resolveDbBrand(options.brandId),
          code,
        },
      },
    })
    .catch(() => {});
}

/** Find link code by code (select userId, expiresAt). */
export async function findTelegramLinkCodeForConfirm(
  code: string,
  options: ScopeOptions = {}
) {
  return prisma.telegramLinkCode.findUnique({
    where: {
      brand_code: {
        brand: resolveDbBrand(options.brandId),
        code,
      },
    },
    select: { brand: true, userId: true, expiresAt: true },
  });
}

/** Confirm link: delete code and upsert whitelist in transaction. Returns userId and brand or null. */
export async function confirmTelegramLinkAndReturnUserId(
  code: string,
  telegramUserId: string
): Promise<{ userId: string; brandId: BrandId } | null> {
  const linkRecord = await prisma.telegramLinkCode.findFirst({
    where: { code },
    select: { brand: true, userId: true, expiresAt: true },
  });
  if (!linkRecord || new Date() > linkRecord.expiresAt) return null;
  const brandId = resolveDbBrand(linkRecord.brand as BrandId | null | undefined);
  await prisma.$transaction(async (tx) => {
    await tx.telegramLinkCode.delete({
      where: { brand_code: { brand: linkRecord.brand, code } },
    });
    await tx.telegramWhitelist.upsert({
      where: {
        brand_userId: {
          brand: linkRecord.brand,
          userId: linkRecord.userId,
        },
      },
      create: {
        brand: linkRecord.brand,
        userId: linkRecord.userId,
        telegramUserId,
      },
      update: { telegramUserId, linkedAt: new Date() },
    });
  });
  return { userId: linkRecord.userId, brandId };
}

/**
 * Get Telegram user id for the partner who owns the given promo code (by promoCodeId).
 * Returns null if promo is not assigned to a partner or partner has no Telegram linked.
 */
export async function getPartnerTelegramUserIdByPromoCodeId(
  promoCodeId: string,
  options: ScopeOptions = {}
): Promise<string | null> {
  const binding = await prisma.partnerPromoCode.findUnique({
    where: { promoCodeId },
    select: { userId: true },
  });
  if (!binding) return null;
  const whitelist = await prisma.telegramWhitelist.findUnique({
    where: {
      brand_userId: {
        brand: resolveDbBrand(options.brandId),
        userId: binding.userId,
      },
    },
    select: { telegramUserId: true },
  });
  return whitelist?.telegramUserId ?? null;
}
