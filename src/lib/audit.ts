import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

interface AuditOptions {
  actorUserId?: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(options: AuditOptions) {
  const data = {
    actorUserId: options.actorUserId,
    entityType: options.entityType,
    entityId: options.entityId,
    action: options.action,
    metadataJson: options.metadata
      ? (options.metadata as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  };

  try {
    await prisma.auditLog.create({ data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003" &&
      data.actorUserId
    ) {
      try {
        await prisma.auditLog.create({
          data: { ...data, actorUserId: null },
        });
        return;
      } catch {
      }
    }
    logger.error("Audit log failed", error, {
      entityType: options.entityType,
      entityId: options.entityId,
      action: options.action,
    });
  }
}
