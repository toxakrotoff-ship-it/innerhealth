import 'server-only';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import type { BrandId } from '@/lib/brand/brand';
import { promoBelongsToBrandScope } from '@/lib/brand/brand-scope';

const PAID_STATUSES = ['paid', 'completed'] as const;

export interface PartnerStatForAdmin {
  promoCodeId: string;
  code: string;
  ordersCount: number;
  totalAmount: number;
}

export interface PartnerStatForPartner {
  promoCodeId: string;
  code: string;
  /** Оплаченные заказы (paid/completed) */
  ordersCount: number;
  /** Всего применений промокода (любой статус заказа) */
  applicationsCount: number;
  partnerIncome: number;
}

export interface PartnerPromoCodeWithDetails {
  id: string;
  promoCodeId: string;
  code: string;
  commissionPercent: number;
  createdAt: Date;
}

/**
 * For admin: per partner's promo code — ordersCount and totalAmount (orders status in paid/completed).
 */
export async function getPartnerStatsByUserId(
  userId: string,
  brandId?: BrandId | null
): Promise<PartnerStatForAdmin[]> {
  const bindings = await prisma.partnerPromoCode.findMany({
    where: { userId },
    include: {
      promoCode: { select: { id: true, code: true } },
    },
  });

  const results: PartnerStatForAdmin[] = [];

  for (const b of bindings) {
    if (!promoBelongsToBrandScope(b.promoCode.code, brandId)) continue;
    const agg = await prisma.order.aggregate({
      where: {
        promoCodeId: b.promoCodeId,
        status: { in: [...PAID_STATUSES] },
      },
      _count: { id: true },
      _sum: { total: true },
    });
    results.push({
      promoCodeId: b.promoCode.id,
      code: b.promoCode.code,
      ordersCount: agg._count.id,
      totalAmount: agg._sum.total ?? 0,
    });
  }

  return results;
}

/**
 * For partner LK: per promo — ordersCount and partnerIncome. Base for income: per-partner setting (order total or discount amount).
 */
export async function getPartnerStatsForPartner(
  userId: string,
  brandId?: BrandId | null
): Promise<PartnerStatForPartner[]> {
  const incomeBase = await getPartnerIncomeBaseForUser(userId);
  const bindings = await prisma.partnerPromoCode.findMany({
    where: { userId },
    include: {
      promoCode: { select: { id: true, code: true } },
    },
  });

  const results: PartnerStatForPartner[] = [];

  for (const b of bindings) {
    if (!promoBelongsToBrandScope(b.promoCode.code, brandId)) continue;
    const [paidAgg, applicationsAgg] = await Promise.all([
      prisma.order.aggregate({
        where: {
          promoCodeId: b.promoCodeId,
          status: { in: [...PAID_STATUSES] },
        },
        _count: { id: true },
        _sum: {
          total: true,
          promoDiscountAmount: true,
        },
      }),
      prisma.order.count({
        where: { promoCodeId: b.promoCodeId },
      }),
    ]);
    const baseAmount =
      incomeBase === 'discount_amount'
        ? (paidAgg._sum.promoDiscountAmount ?? 0)
        : (paidAgg._sum.total ?? 0);
    const partnerIncome = baseAmount * (b.commissionPercent / 100);
    results.push({
      promoCodeId: b.promoCode.id,
      code: b.promoCode.code,
      ordersCount: paidAgg._count.id,
      applicationsCount: applicationsAgg,
      partnerIncome,
    });
  }

  return results;
}

/**
 * Assign a promo code to a partner. Fails if user is not PARTNER or promo is already assigned.
 */
export async function assignPromoCodeToPartner(
  userId: string,
  promoCodeId: string,
  commissionPercent: number
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== Role.PARTNER) {
    return { ok: false, error: 'User is not a partner' };
  }

  const existing = await prisma.partnerPromoCode.findUnique({
    where: { promoCodeId },
  });
  if (existing) {
    return { ok: false, error: 'Promo code is already assigned to a partner' };
  }

  const record = await prisma.partnerPromoCode.create({
    data: {
      userId,
      promoCodeId,
      commissionPercent,
    },
    select: { id: true },
  });
  return { ok: true, id: record.id };
}

/**
 * Update commission percent for a partner–promo binding. If userId is provided, only update if binding belongs to that partner.
 */
export async function updatePartnerPromoCommission(
  partnerPromoId: string,
  commissionPercent: number,
  userId?: string
): Promise<boolean> {
  const result = await prisma.partnerPromoCode.updateMany({
    where: userId ? { id: partnerPromoId, userId } : { id: partnerPromoId },
    data: { commissionPercent },
  });
  return result.count > 0;
}

/**
 * Remove partner–promo binding. If userId is provided, only delete if binding belongs to that partner.
 */
export async function removePromoCodeFromPartner(
  partnerPromoId: string,
  userId?: string
): Promise<boolean> {
  const result = await prisma.partnerPromoCode.deleteMany({
    where: userId ? { id: partnerPromoId, userId } : { id: partnerPromoId },
  });
  return result.count > 0;
}

/**
 * List partner's promo code bindings with code and commission for admin.
 */
export async function getPartnerPromoCodes(
  userId: string,
  brandId?: BrandId | null
): Promise<PartnerPromoCodeWithDetails[]> {
  const list = await prisma.partnerPromoCode.findMany({
    where: { userId },
    include: {
      promoCode: { select: { id: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return list
    .filter((p) => promoBelongsToBrandScope(p.promoCode.code, brandId))
    .map((p) => ({
    id: p.id,
    promoCodeId: p.promoCode.id,
    code: p.promoCode.code,
    commissionPercent: p.commissionPercent,
    createdAt: p.createdAt,
  }));
}

/**
 * Check that user exists and has role PARTNER.
 */
export async function ensureUserIsPartner(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === Role.PARTNER;
}

/**
 * Get partner's income base setting. Returns order_total if not set or user not partner.
 */
export async function getPartnerIncomeBaseForUser(
  userId: string
): Promise<'order_total' | 'discount_amount'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, partnerIncomeBase: true },
  });
  if (user?.role !== Role.PARTNER) return 'order_total';
  const v = user.partnerIncomeBase?.trim().toLowerCase();
  return v === 'discount_amount' ? 'discount_amount' : 'order_total';
}

/**
 * Update partner's income base (admin). Fails if user is not PARTNER.
 */
export async function updatePartnerIncomeBase(
  userId: string,
  partnerIncomeBase: 'order_total' | 'discount_amount'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isPartner = await ensureUserIsPartner(userId);
  if (!isPartner) {
    return { ok: false, error: 'User is not a partner' };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { partnerIncomeBase },
  });
  return { ok: true };
}

/** Check that partner has at least one promo binding in brand scope. */
export async function hasPartnerPromoInBrandScope(
  userId: string,
  brandId?: BrandId | null
): Promise<boolean> {
  const bindings = await prisma.partnerPromoCode.findMany({
    where: { userId },
    include: { promoCode: { select: { code: true } } },
    take: 100,
  });
  return bindings.some((binding) => promoBelongsToBrandScope(binding.promoCode.code, brandId));
}

/** Check that partner promo binding belongs to partner and current brand scope. */
export async function isPartnerPromoInBrandScope(
  partnerPromoId: string,
  userId: string,
  brandId?: BrandId | null
): Promise<boolean> {
  const binding = await prisma.partnerPromoCode.findFirst({
    where: { id: partnerPromoId, userId },
    include: { promoCode: { select: { code: true } } },
  });
  if (!binding) return false;
  return promoBelongsToBrandScope(binding.promoCode.code, brandId);
}
