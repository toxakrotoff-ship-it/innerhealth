import 'server-only';
import { prisma } from '@/lib/prisma';

/** Get all Tilda leads for admin. */
export async function getTildaLeads() {
  return prisma.tildaLead.findMany({
    orderBy: { createdAt: 'desc' },
  });
}
