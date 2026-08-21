import type { ActivityLogAction, ActivityLogEntityType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface LogActivityParams {
  actor: { id: string; email: string };
  entityType: ActivityLogEntityType;
  action: ActivityLogAction;
  entityId: string;
  entityName: string;
  brand: string;
  changes?: Prisma.InputJsonValue;
}

/** Fire-and-forget audit log write; failures must never break the caller's main operation. */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: params.actor.id,
        actorEmail: params.actor.email,
        entityType: params.entityType,
        action: params.action,
        entityId: params.entityId,
        entityName: params.entityName,
        brand: params.brand,
        changes: params.changes,
      },
    });
  } catch (error) {
    console.error('Failed to write activity log:', error);
  }
}
