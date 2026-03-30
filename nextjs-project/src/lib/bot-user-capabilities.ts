import 'server-only';

import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface BotUserCapabilities {
  isLinked: boolean;
  isAdmin: boolean;
  isPartner: boolean;
}

function buildCapabilities(role: Role | null | undefined, isLinked: boolean): BotUserCapabilities {
  return {
    isLinked,
    isAdmin: isLinked && (role === Role.ADMIN || role === Role.WRITER),
    isPartner: isLinked && role === Role.PARTNER,
  };
}

export async function getTelegramBotUserCapabilities(
  telegramUserId: string
): Promise<BotUserCapabilities> {
  const row = await prisma.telegramWhitelist.findUnique({
    where: { telegramUserId },
    select: { user: { select: { role: true } } },
  });
  return buildCapabilities(row?.user.role, Boolean(row));
}

export async function getMaxBotUserCapabilities(
  maxUserId: string
): Promise<BotUserCapabilities> {
  const row = await prisma.maxWhitelist.findUnique({
    where: { maxUserId },
    select: { user: { select: { role: true } } },
  });
  return buildCapabilities(row?.user.role, Boolean(row));
}
