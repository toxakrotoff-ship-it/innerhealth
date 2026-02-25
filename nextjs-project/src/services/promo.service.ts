import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Get promo by id (for order creation validation). */
export async function findPromoById(id: string) {
  return prisma.promoCode.findUnique({
    where: { id },
  });
}

/** Get promo by code (for public validate endpoint). */
export async function findPromoByCode(code: string) {
  return prisma.promoCode.findUnique({
    where: { code: code.trim() },
  });
}

/** Get promo code string by id (for notifications). */
export async function getPromoCodeStringById(id: string): Promise<string | null> {
  const p = await prisma.promoCode.findUnique({
    where: { id },
    select: { code: true },
  });
  return p?.code ?? null;
}

/** Get all promoCodes for admin. */
export async function getPromoCodesForAdmin() {
  return prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/** Create promo code. */
export async function createPromoCode(data: Prisma.PromoCodeCreateInput) {
  return prisma.promoCode.create({
    data,
  });
}

/** Update promo code. */
export async function updatePromoCode(id: string, data: Prisma.PromoCodeUpdateInput) {
  return prisma.promoCode.update({
    where: { id },
    data,
  });
}

/** Delete promo code. */
export async function deletePromoCode(id: string) {
  return prisma.promoCode.delete({
    where: { id },
  });
}

/** Find by id (for PATCH/DELETE existence check). */
export async function findPromoCodeById(id: string) {
  return prisma.promoCode.findUnique({
    where: { id },
  });
}
