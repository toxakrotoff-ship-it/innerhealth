import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BrandId } from '@/lib/brand/brand';
import { resolveDbBrand } from '@/lib/brand/brand-db';

/** Get all contact help leads for admin. */
export async function getContactHelpLeads(brandId: BrandId | null = null) {
  return prisma.contactHelpLead.findMany({
    where: { brand: resolveDbBrand(brandId) },
    orderBy: { createdAt: 'desc' },
  });
}

/** Create contact help lead from floating widget. */
export async function createContactHelpLead(
  data: Omit<Prisma.ContactHelpLeadCreateInput, 'brand'>,
  brandId: BrandId | null = null
) {
  return prisma.contactHelpLead.create({
    data: {
      ...data,
      brand: resolveDbBrand(brandId),
    },
  });
}
