import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import {
  normalizePromoCodeForScope,
  promoBelongsToBrandScope,
} from '@/lib/brand/brand-scope';

/** Get promo by id (for order creation validation). */
export async function findPromoById(id: string, brandId?: BrandId | null) {
  const promo = await prisma.promoCode.findUnique({
    where: { id },
  });
  if (!promo) return null;
  return promoBelongsToBrandScope(promo.code, brandId) ? promo : null;
}

/** Get promo by code (for public validate endpoint). */
export async function findPromoByCode(code: string, brandId?: BrandId | null) {
  const normalizedCode = normalizePromoCodeForScope(code.trim(), brandId);
  const promo = await prisma.promoCode.findUnique({
    where: { code: normalizedCode },
  });
  if (!promo) return null;
  return promoBelongsToBrandScope(promo.code, brandId) ? promo : null;
}

/** Get promo code string by id (for notifications). */
export async function getPromoCodeStringById(id: string, brandId?: BrandId | null): Promise<string | null> {
  const p = await prisma.promoCode.findUnique({
    where: { id },
    select: { code: true },
  });
  if (!p?.code) return null;
  return promoBelongsToBrandScope(p.code, brandId) ? p.code : null;
}

/** Get all promoCodes for admin. */
export async function getPromoCodesForAdmin(brandId?: BrandId | null) {
  const items = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return items.filter((item) => promoBelongsToBrandScope(item.code, brandId));
}

/** Create promo code. */
export async function createPromoCode(data: Prisma.PromoCodeCreateInput, brandId?: BrandId | null) {
  const preparedData: Prisma.PromoCodeCreateInput = {
    ...data,
    code: normalizePromoCodeForScope(data.code, brandId),
  };
  return prisma.promoCode.create({
    data: preparedData,
  });
}

/** Update promo code. */
export async function updatePromoCode(id: string, data: Prisma.PromoCodeUpdateInput, brandId?: BrandId | null) {
  const existing = await prisma.promoCode.findUnique({
    where: { id },
    select: { code: true },
  });
  if (!existing || !promoBelongsToBrandScope(existing.code, brandId)) {
    throw new Error('Promo code not found in selected brand scope');
  }

  const preparedData: Prisma.PromoCodeUpdateInput = { ...data };
  if (typeof data.code === 'string') {
    preparedData.code = normalizePromoCodeForScope(data.code, brandId);
  }
  return prisma.promoCode.update({
    where: { id },
    data: preparedData,
  });
}

/** Delete promo code. */
export async function deletePromoCode(id: string, brandId?: BrandId | null) {
  const existing = await prisma.promoCode.findUnique({
    where: { id },
    select: { code: true },
  });
  if (!existing || !promoBelongsToBrandScope(existing.code, brandId)) {
    throw new Error('Promo code not found in selected brand scope');
  }
  return prisma.promoCode.delete({
    where: { id },
  });
}

/** Find by id (for PATCH/DELETE existence check). */
export async function findPromoCodeById(id: string, brandId?: BrandId | null) {
  const promo = await prisma.promoCode.findUnique({
    where: { id },
  });
  if (!promo) return null;
  return promoBelongsToBrandScope(promo.code, brandId) ? promo : null;
}
