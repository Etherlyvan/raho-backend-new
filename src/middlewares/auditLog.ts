import { prisma } from "@/config/prisma";
import { Prisma }  from "@/generated/prisma";

interface AuditLogInput {
  userId:      string;
  action:      string;
  resource:    string;
  resourceId?: string;
  meta?:       Record<string, unknown>;
  ipAddress?:  string;
}

export const recordAuditLog = async (
  input: AuditLogInput
): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId:     input.userId,
      action:     input.action,
      resource:   input.resource,
      resourceId: input.resourceId,
      meta:       (input.meta ?? {}) as Prisma.InputJsonValue, // ← cast eksplisit
      ipAddress:  input.ipAddress,
    },
  });
};