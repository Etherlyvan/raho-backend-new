import { prisma }              from "../../config/prisma";
import { AppError }            from "../../utils/AppError";
import { checkSessionAccess }  from "../sessions/sessions.service";
import { logAudit }            from "../../utils/auditLog.helper";
import { generateMutationRef } from "../../utils/uniqueCode";
import { MutationType }        from "../../generated/prisma";
import type { RequestUser }    from "../../types/express";
import type { UpsertInfusionDto } from "./infusion.validator";

// ─── Dose → InventoryItem keyword mapping ─────────────────────────────────────
// Dipakai untuk auto stock deduction. Keyword dicocokkan dengan masterProduct.name (case-insensitive).
const DOSE_STOCK_MAP: { field: keyof UpsertInfusionDto; keyword: string; unit: string }[] = [
  { field: "ifaMgActual",   keyword: "IFA",  unit: "mg" },
  { field: "hhoMlActual",   keyword: "HHO",  unit: "ml" },
  { field: "h2MlActual",    keyword: "H2",   unit: "ml" },
  { field: "noMlActual",    keyword: "NO",   unit: "ml" },
  { field: "gasoMlActual",  keyword: "GASO", unit: "ml" },
  { field: "o2MlActual",    keyword: "O2",   unit: "ml" },
  { field: "o3MlActual",    keyword: "O3",   unit: "ml" },
  { field: "edtaMlActual",  keyword: "EDTA", unit: "ml" },
  { field: "mbMlActual",    keyword: "MB",   unit: "ml" },
  { field: "h2sMlActual",   keyword: "H2S",  unit: "ml" },
  { field: "kclMlActual",   keyword: "KCL",  unit: "ml" },
  { field: "jmlNbMlActual", keyword: "NaCl", unit: "ml" },
];

// ─── Plan → Actual mapping (untuk deviation check) ────────────────────────────
const PLAN_ACTUAL_MAP: { plan: string; actual: keyof UpsertInfusionDto }[] = [
  { plan: "ifaMg",   actual: "ifaMgActual" },
  { plan: "hhoMl",   actual: "hhoMlActual" },
  { plan: "h2Ml",    actual: "h2MlActual" },
  { plan: "noMl",    actual: "noMlActual" },
  { plan: "gasoMl",  actual: "gasoMlActual" },
  { plan: "o2Ml",    actual: "o2MlActual" },
  { plan: "o3Ml",    actual: "o3MlActual" },
  { plan: "edtaMl",  actual: "edtaMlActual" },
  { plan: "mbMl",    actual: "mbMlActual" },
  { plan: "h2sMl",   actual: "h2sMlActual" },
  { plan: "kclMl",   actual: "kclMlActual" },
  { plan: "jmlNbMl", actual: "jmlNbMlActual" },
];

// ─── Get ──────────────────────────────────────────────────────────────────────

export const getInfusionService = async (
  sessionId: string,
  user: RequestUser
) => {
  const session = await checkSessionAccess(sessionId, user);
  return {
    therapyPlan:      session.therapyPlan ?? null,
    infusionExecution: session.infusionExecution ?? null,
  };
};

// ─── Upsert ───────────────────────────────────────────────────────────────────

export const upsertInfusionService = async (
  sessionId: string,
  dto: UpsertInfusionDto,
  user: RequestUser,
  ipAddress?: string
) => {
  const session = await checkSessionAccess(sessionId, user);
  const plan    = session.therapyPlan;

  // 1. Deviation check — jika ada perbedaan aktual vs plan, deviationNote wajib
  if (plan) {
    const hasDeviation = PLAN_ACTUAL_MAP.some(({ plan: p, actual: a }) => {
      const planVal   = (plan as Record<string, unknown>)[p] as number ?? 0;
      const actualVal = (dto[a] as number | undefined) ?? 0;
      return Math.abs(planVal - actualVal) > 0.001;
    });

    if (hasDeviation && !dto.deviationNote?.trim()) {
      throw new AppError(
        "deviationNote wajib diisi karena ada perbedaan dosis dari rencana terapi dokter.",
        422
      );
    }
  }

  // 2. Resolve InventoryItems yang terpakai (hanya dosis > 0 dan item ada di cabang)
  const branchId = session.encounter.branch.branchId;
  const dosesToDeduct = await resolveDoses(dto, branchId);

  // 3. Cek kecukupan stok sebelum transaksi
  for (const { item, qty, keyword } of dosesToDeduct) {
    if (item.stock < qty) {
      throw new AppError(
        `Stok tidak mencukupi untuk ${keyword}. Tersedia: ${item.stock} — Dibutuhkan: ${qty}.`,
        422
      );
    }
  }

  // 4. Jalankan dalam 1 transaksi: upsert infusion + deduct stock + mutation records
  const infusion = await prisma.$transaction(async (tx) => {
    const existing = await tx.infusionExecution.findUnique({
      where: { treatmentSessionId: sessionId },
    });

    const infusion = await tx.infusionExecution.upsert({
      where:  { treatmentSessionId: sessionId },
      create: {
        treatmentSessionId:    sessionId,
        filledBy:              user.userId,
        tglProduksiCairan:     dto.tglProduksiCairan ? new Date(dto.tglProduksiCairan) : undefined,
        jenisBotol:            dto.jenisBotol,
        jenisCairan:           dto.jenisCairan,
        volumeCarrierMl:       dto.volumeCarrierMl,
        jumlahPenggunaanJarum: dto.jumlahPenggunaanJarum,
        keterangan:            dto.keterangan,
        deviationNote:         dto.deviationNote,
        ifaMgActual:   dto.ifaMgActual,
        hhoMlActual:   dto.hhoMlActual,
        h2MlActual:    dto.h2MlActual,
        noMlActual:    dto.noMlActual,
        gasoMlActual:  dto.gasoMlActual,
        o2MlActual:    dto.o2MlActual,
        o3MlActual:    dto.o3MlActual,
        edtaMlActual:  dto.edtaMlActual,
        mbMlActual:    dto.mbMlActual,
        h2sMlActual:   dto.h2sMlActual,
        kclMlActual:   dto.kclMlActual,
        jmlNbMlActual: dto.jmlNbMlActual,
      },
      update: {
        filledBy:              user.userId,
        tglProduksiCairan:     dto.tglProduksiCairan ? new Date(dto.tglProduksiCairan) : undefined,
        jenisBotol:            dto.jenisBotol,
        jenisCairan:           dto.jenisCairan,
        volumeCarrierMl:       dto.volumeCarrierMl,
        jumlahPenggunaanJarum: dto.jumlahPenggunaanJarum,
        keterangan:            dto.keterangan,
        deviationNote:         dto.deviationNote,
        ifaMgActual:   dto.ifaMgActual,
        hhoMlActual:   dto.hhoMlActual,
        h2MlActual:    dto.h2MlActual,
        noMlActual:    dto.noMlActual,
        gasoMlActual:  dto.gasoMlActual,
        o2MlActual:    dto.o2MlActual,
        o3MlActual:    dto.o3MlActual,
        edtaMlActual:  dto.edtaMlActual,
        mbMlActual:    dto.mbMlActual,
        h2sMlActual:   dto.h2sMlActual,
        kclMlActual:   dto.kclMlActual,
        jmlNbMlActual: dto.jmlNbMlActual,
      },
    });

    // Hanya deduct stok pada CREATE pertama (bukan update)
    if (!existing) {
      for (const { item, qty, keyword, branchId } of dosesToDeduct) {
        const stockBefore = item.stock;
        const stockAfter  = stockBefore - qty;
        const ref         = await generateMutationRef("USE", branchId);

        await tx.inventoryItem.update({
          where: { inventoryItemId: item.inventoryItemId },
          data:  { stock: stockAfter },
        });

        await tx.stockMutation.create({
          data: {
            inventoryItemId: item.inventoryItemId,
            branchId,
            type:        MutationType.USED,
            quantity:    -qty,
            stockBefore,
            stockAfter,
            createdBy:   user.userId,
            notes:       `${ref} | Auto-deduct infusi sesi ${sessionId} (${keyword})`,
          },
        });
      }
    }

    return infusion;
  });

  await logAudit({
    userId:     user.userId,
    action:     "CREATE",
    resource:   "InfusionExecution",
    resourceId: infusion.infusionExecutionId,
    meta:       { sessionId, deviationNote: dto.deviationNote ?? null },
    ipAddress,
  });

  return infusion;
};

// ─── Helper: resolve inventory items dari dosis aktual ────────────────────────

async function resolveDoses(dto: UpsertInfusionDto, branchId: string) {
  const results: { item: { inventoryItemId: string; stock: number }; qty: number; keyword: string; branchId: string }[] = [];

  for (const { field, keyword } of DOSE_STOCK_MAP) {
    const qty = (dto[field] as number | undefined) ?? 0;
    if (qty <= 0) continue;

    const item = await prisma.inventoryItem.findFirst({
      where: {
        branchId,
        isActive: true,
        masterProduct: {
          name:     { contains: keyword, mode: "insensitive" },
          isActive: true,
        },
      },
      select: { inventoryItemId: true, stock: true },
    });

    if (!item) continue; // Stok belum disetting → skip tanpa error
    results.push({ item, qty, keyword, branchId });
  }

  return results;
}