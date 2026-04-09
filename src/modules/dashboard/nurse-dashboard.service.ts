import { prisma }       from "../../config/prisma";
import type { RequestUser } from "../../types/express";

export class NurseDashboardService {

  async getSummary(actor: RequestUser) {
    const branchId = actor.branchId!;
    const nurseId  = actor.userId;

    const now       = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000); // +1 hari
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── Paralel query ─────────────────────────────────────────────────────────
    const [
      sessionsToday,
      sessionInProgress,
      sessionsThisMonth,
      pendingVitalSigns,
      recentSessions,
    ] = await Promise.all([

      // Sesi hari ini di cabang nurse (semua nurse)
      prisma.treatmentSession.count({
        where: {
          encounter  : { branchId },
          treatmentDate: { gte: todayStart, lt: todayEnd },
          status     : { in: ["PLANNED", "IN_PROGRESS", "COMPLETED"] },
        },
      }),

      // Sesi sedang berjalan (INPROGRESS) — perlu perhatian
      prisma.treatmentSession.count({
        where: {
          encounter : { branchId },
          status    : "IN_PROGRESS",
        },
      }),

      // Total sesi bulan ini
      prisma.treatmentSession.count({
        where: {
          encounter    : { branchId },
          treatmentDate: { gte: monthStart },
          status       : { in: ["IN_PROGRESS", "COMPLETED"] },
        },
      }),

      // Sesi INPROGRESS tanpa vital sign = belum dicatat
      prisma.treatmentSession.count({
        where: {
          encounter  : { branchId },
          nurseId,
          status     : "IN_PROGRESS",
          vitalSigns : { none: {} },
        },
      }),

      // 8 sesi terbaru yang ditangani nurse ini
      prisma.treatmentSession.findMany({
        where  : { nurseId },
        orderBy: { treatmentDate: "desc" },
        take   : 8,
        select : {
          treatmentSessionId: true,
          infusKe           : true,
          status            : true,
          treatmentDate     : true,
          pelaksanaan       : true,
          encounter: {
            select: {
              encounterId : true,
              member      : { select: { memberNo: true, fullName: true } },
              branch      : { select: { name: true } },
            },
          },
          vitalSigns : { select: { sessionVitalSignId: true }, take: 1 },
          infusionExecution: { select: { infusionExecutionId: true } },
        },
      }),
    ]);

    return {
      stats: {
        sessionsToday,
        sessionInProgress,
        sessionsThisMonth,
        pendingVitalSigns,  // sesi berjalan tanpa tanda vital
      },
      recentSessions: recentSessions.map((s) => ({
        ...s,
        hasVitalSigns    : s.vitalSigns.length > 0,
        hasInfusion      : !!s.infusionExecution,
        vitalSigns       : undefined,       // buang array mentah
        infusionExecution: undefined,
      })),
    };
  }
}