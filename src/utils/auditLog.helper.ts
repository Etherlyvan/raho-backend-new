import { prisma } from "../config/prisma";
import { Prisma } from "../generated/prisma";
import { Request } from "express";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT";

interface AuditParams {
  userId:      string;
  action:      AuditAction;
  resource:    string;
  resourceId?: string;
  meta?:       Record<string, unknown>;
  req?:        Request;
  ipAddress?:  string;   // ← FIX: tambah ini
}

export const logAudit = async ({
  userId,
  action,
  resource,
  resourceId,
  meta,
  req,
  ipAddress,             // ← FIX: destructure
}: AuditParams): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      resourceId: resourceId ?? null,
      meta: (meta ?? {}) as Prisma.InputJsonValue,
      // Prioritas: dari req → dari ipAddress string → null
      ipAddress: req
        ? (req.ip ?? req.socket.remoteAddress ?? null)
        : (ipAddress ?? null),
    },
  });
};