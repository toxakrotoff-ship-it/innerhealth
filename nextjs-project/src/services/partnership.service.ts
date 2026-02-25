import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Get all partnership leads for admin. */
export async function getPartnershipLeads() {
  return prisma.partnershipLead.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/** Create partnership lead. */
export async function createPartnershipLead(data: Prisma.PartnershipLeadCreateInput) {
  return prisma.partnershipLead.create({
    data,
  });
}
