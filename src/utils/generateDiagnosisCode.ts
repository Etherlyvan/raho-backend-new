import { prisma } from "../config/prisma";

/**
 * Format: DX-{BRANCH_3}-{YYMM}-{NNNNN}
 * Contoh: DX-PST-2604-00001
 *
 * DX      = prefix Diagnosis
 * PST     = 3 huruf kode cabang (branchCode)
 * 2604    = YY (tahun) + MM (bulan, 2 digit)
 * 00001   = urutan per cabang per bulan
 */
export async function generateDiagnosisCode(branchId: string): Promise<string> {
  const branch = await prisma.branch.findUniqueOrThrow({ where: { branchId } });

  const branchSlug = branch.branchCode.slice(0, 3).toUpperCase();
  const now        = new Date();
  const yy         = now.getFullYear().toString().slice(-2);
  const mm         = String(now.getMonth() + 1).padStart(2, "0");
  const prefix     = `DX-${branchSlug}-${yy}${mm}-`;

  const count = await prisma.diagnosis.count({
    where: { diagnosisCode: { startsWith: prefix } },
  });

  const seq = String(count + 1).padStart(5, "0");
  return `${prefix}${seq}`;
}