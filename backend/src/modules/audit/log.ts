import type { Prisma, PrismaClient } from '@prisma/client';

export async function audit(
  db: PrismaClient,
  entry: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId: string;
    diff?: Record<string, unknown>;
    ip?: string;
  },
): Promise<void> {
  await db.auditLog.create({
    data: {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      ...(entry.diff ? { diff: entry.diff as Prisma.InputJsonValue } : {}),
      ...(entry.ip ? { ip: entry.ip } : {}),
    },
  });
}
