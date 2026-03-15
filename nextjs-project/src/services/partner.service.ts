import 'server-only';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

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
  userId: string
): Promise<PartnerStatForAdmin[]> {
  const bindings = await prisma.partnerPromoCode.findMany({
    where: { userId },
    include: {
      promoCode: { select: { id: true, code: true } },
    },
  });

  const results: PartnerStatForAdmin[] = [];

  for (const b of bindings) {
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
 * For partner LK: per promo — ordersCount and partnerIncome (totalAmount * commissionPercent/100). No totalAmount in response.
 */
export async function getPartnerStatsForPartner(
  userId: string
): Promise<PartnerStatForPartner[]> {
  const bindings = await prisma.partnerPromoCode.findMany({
    where: { userId },
    include: {
      promoCode: { select: { id: true, code: true } },
    },
  });

  const results: PartnerStatForPartner[] = [];

  for (const b of bindings) {
    const [paidAgg, applicationsAgg] = await Promise.all([
      prisma.order.aggregate({
        where: {
          promoCodeId: b.promoCodeId,
          status: { in: [...PAID_STATUSES] },
        },
        _count: { id: true },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: { promoCodeId: b.promoCodeId },
      }),
    ]);
    const totalAmount = paidAgg._sum.total ?? 0;
    const partnerIncome = totalAmount * (b.commissionPercent / 100);
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
  userId: string
): Promise<PartnerPromoCodeWithDetails[]> {
  const list = await prisma.partnerPromoCode.findMany({
    where: { userId },
    include: {
      promoCode: { select: { id: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return list.map((p) => ({
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
