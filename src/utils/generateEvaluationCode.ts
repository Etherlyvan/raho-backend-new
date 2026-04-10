import { prisma } from '../config/prisma';

/**
 * Format  : EVL-{CAB3}-{YYMM}-{NNNNN}
 * Contoh  : EVL-PUS-2604-00001
 * Makna   :
 *   EVL    = Evaluasi Dokter
 *   CAB3   = 3 huruf kode cabang (dari branchCode)
 *   YYMM   = 2 digit tahun + 2 digit bulan
 *   NNNNN  = nomor urut 5 digit per cabang per bulan
 */
export async function generateEvaluationCode(branchId: string): Promise<string> {
  const branch = await prisma.branch.findUniqueOrThrow({
    where:  { branchId },
    select: { branchCode: true },
  });

  const cab3   = branch.branchCode.slice(0, 3).toUpperCase();
  const now    = new Date();
  const yy     = String(now.getFullYear()).slice(-2);
  const mm     = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `EVL-${cab3}-${yy}${mm}-`;

  const count = await prisma.doctorEvaluation.count({
    where: { evaluationCode: { startsWith: prefix } },
  });

  return `${prefix}${String(count + 1).padStart(5, '0')}`;
}