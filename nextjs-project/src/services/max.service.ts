import 'server-only';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';

interface ScopeOptions {
  brandId?: BrandId | null;
}

export async function getMaxWhitelist(options: ScopeOptions = {}) {
  return prisma.maxWhitelist.findMany({
    where: { brand: resolveDbBrand(options.brandId) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
}

export async function findMaxWhitelistByMaxUserId(
  maxUserId: string,
  options: ScopeOptions = {}
) {
  return prisma.maxWhitelist.findUnique({
    where: {
      brand_maxUserId: {
        brand: resolveDbBrand(options.brandId),
        maxUserId,
      },
    },
  });
}

export async function findMaxWhitelistByUserId(
  userId: string,
  options: ScopeOptions = {}
) {
  return prisma.maxWhitelist.findUnique({
    where: {
      brand_userId: {
        brand: resolveDbBrand(options.brandId),
        userId,
      },
    },
  });
}

export async function findMaxWhitelistStatusByUserId(
  userId: string,
  options: ScopeOptions = {}
) {
  return prisma.maxWhitelist.findUnique({
    where: {
      brand_userId: {
        brand: resolveDbBrand(options.brandId),
        userId,
      },
    },
    select: { maxUserId: true, linkedAt: true },
  });
}

export async function deleteMaxWhitelistByUserId(
  userId: string,
  options: ScopeOptions = {}
) {
  return prisma.maxWhitelist.deleteMany({
    where: { brand: resolveDbBrand(options.brandId), userId },
  });
}

export async function createMaxLinkCode(params: {
  code: string;
  userId: string;
  expiresAt: Date;
  brandId?: BrandId | null;
}) {
  return prisma.maxLinkCode.create({
    data: {
      brand: resolveDbBrand(params.brandId),
      code: params.code,
      userId: params.userId,
      expiresAt: params.expiresAt,
    },
  });
}

export async function findMaxLinkCodeForConfirm(
  code: string,
  options: ScopeOptions = {}
) {
  return prisma.maxLinkCode.findUnique({
    where: {
      brand_code: {
        brand: resolveDbBrand(options.brandId),
        code,
      },
    },
    select: { brand: true, userId: true, expiresAt: true },
  });
}

export async function confirmMaxLinkAndReturnUserId(
  code: string,
  maxUserId: string
): Promise<{ userId: string; brandId: BrandId } | null> {
  const linkRecord = await prisma.maxLinkCode.findFirst({
    where: { code },
    select: { brand: true, userId: true, expiresAt: true },
  });
  if (!linkRecord || new Date() > linkRecord.expiresAt) return null;
  const brandId = resolveDbBrand(linkRecord.brand as BrandId | null | undefined);
  await prisma.$transaction(async (tx) => {
    await tx.maxLinkCode.delete({
      where: { brand_code: { brand: linkRecord.brand, code } },
    });
    await tx.maxWhitelist.upsert({
      where: {
        brand_userId: {
          brand: linkRecord.brand,
          userId: linkRecord.userId,
        },
      },
      create: { brand: linkRecord.brand, userId: linkRecord.userId, maxUserId },
      update: { maxUserId, linkedAt: new Date() },
    });
  });
  return { userId: linkRecord.userId, brandId };
}

export async function getPartnerMaxUserIdByPromoCodeId(
  promoCodeId: string,
  options: ScopeOptions = {}
): Promise<string | null> {
  const binding = await prisma.partnerPromoCode.findUnique({
    where: { promoCodeId },
    select: { userId: true },
  });
  if (!binding) return null;
  const whitelist = await prisma.maxWhitelist.findUnique({
    where: {
      brand_userId: {
        brand: resolveDbBrand(options.brandId),
        userId: binding.userId,
      },
    },
    select: { maxUserId: true },
  });
  return whitelist?.maxUserId ?? null;
}
