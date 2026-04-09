import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { logAudit } from "../../utils/auditLog.helper";
import { generateMutationRef } from "../../utils/uniqueCode";
import { checkSessionAccess } from "../sessions/sessions.service";
import { MutationType } from "../../generated/prisma";
import type { RequestUser } from "../../types/express";

interface CreateMaterialDto {
  inventoryItemId: string;
  quantity: number;
  unit: string;
}

export const listMaterialsService = async (sessionId: string, user: RequestUser) => {
  await checkSessionAccess(sessionId, user);
  return prisma.materialUsage.findMany({
    where: { treatmentSessionId: sessionId },
    include: {
      item: {
        include: { masterProduct: { select: { name: true, category: true, unit: true } } },
      },
      inputByUser: { include: { profile: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
};

export const createMaterialService = async (
  sessionId: string,
  user: RequestUser,
  dto: CreateMaterialDto,
) => {
  const session = await checkSessionAccess(sessionId, user);
  const branchId = session.encounter.branch.branchId;

  const item = await prisma.inventoryItem.findUnique({
    where: { inventoryItemId: dto.inventoryItemId },
    include: { masterProduct: { select: { name: true, unit: true } } },
  });

  if (!item || !item.isActive) throw new AppError("Item inventori tidak ditemukan atau nonaktif", 404);

  if (item.branchId !== branchId)
    throw new AppError("Item tidak tersedia di cabang sesi ini", 403);

  if (item.stock < dto.quantity)
    throw new AppError(
      `Stok ${item.masterProduct.name} tidak mencukupi. Tersedia: ${item.stock} ${item.masterProduct.unit}`,
      422,
    );

  const stockAfter = item.stock - dto.quantity;
  const mutationRef = await generateMutationRef("USE", branchId);

  const [usage] = await prisma.$transaction([
    prisma.materialUsage.create({
      data: {
        treatmentSessionId: sessionId,
        inventoryItemId: dto.inventoryItemId,
        quantity: dto.quantity,
        unit: dto.unit,
        inputBy: user.userId,
      },
      include: {
        item: { include: { masterProduct: { select: { name: true, category: true } } } },
      },
    }),
    prisma.inventoryItem.update({
      where: { inventoryItemId: dto.inventoryItemId },
      data: { stock: { decrement: dto.quantity } },
    }),
    prisma.stockMutation.create({
      data: {
        inventoryItemId: dto.inventoryItemId,
        branchId,
        type: MutationType.USED,
        quantity: -dto.quantity,
        stockBefore: item.stock,
        stockAfter,
        notes: mutationRef,
        createdBy: user.userId,
      },
    }),
  ]);

  await logAudit({
    userId: user.userId,
    action: "CREATE",
    resource: "MaterialUsage",
    resourceId: usage.materialUsageId,
    meta: { sessionId, inventoryItemId: dto.inventoryItemId, quantity: dto.quantity },
  });

  return usage;
};