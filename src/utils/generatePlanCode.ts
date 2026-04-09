import {prisma} from '../config/prisma';

/**
 * Generate kode unik Terapi Plan.
 *
 * Format : TP-{CABANG}-{YYMM}-{NNNNN}
 * Contoh : TP-PST-2604-00003
 *
 * - TP     → prefix dokumen Terapi Plan
 * - CABANG → 3-huruf kode cabang kapital (PST, MLG, SBY, ...)
 * - YYMM   → 2-digit tahun + 2-digit bulan (reset tiap bulan)
 * - NNNNN  → nomor urut 5-digit per cabang per bulan
 */
export async function generatePlanCode(branchCode: string): Promise<string> {
  const now = new Date();
  const yy   = String(now.getFullYear()).slice(-2);
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `TP-${branchCode.toUpperCase().slice(0, 3)}-${yy}${mm}-`;

  const last = await prisma.sessionTherapyPlan.findFirst({
    where:   { planCode: { startsWith: prefix } },
    orderBy: { planCode: 'desc' },
    select:  { planCode: true },
  });

  const seq = last?.planCode
    ? parseInt(last.planCode.slice(-5), 10) + 1
    : 1;

  return `${prefix}${String(seq).padStart(5, '0')}`;
}