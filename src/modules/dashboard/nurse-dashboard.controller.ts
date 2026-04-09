// src/modules/dashboard/nurse-dashboard.controller.ts
import type { Response, NextFunction } from "express";
import type { AuthRequest }            from "../../middlewares/authenticate";
import { prisma }                      from "../../config/prisma";
import { sendSuccess }                 from "../../utils/response";
import { AppError }                    from "../../utils/AppError";

export const getNurseDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const actor = req.user!;

    const GLOBAL_ROLES = ["SUPERADMIN", "ADMINMANAGER"] as const;
    const isGlobal     = GLOBAL_ROLES.includes(actor.roleName as never);

    if (!isGlobal && !actor.branchId) {
      throw new AppError("User tidak memiliki cabang.", 403);
    }

    // branchFilter untuk relasi encounter → branch
    const branchFilter = isGlobal ? {} : { branchId: actor.branchId! };

    // ── Time ranges ──────────────────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());

    // ── Paralel queries ──────────────────────────────────────────────────────
    const [
      sessionsToday,
      sessionInProgress,
      sessionsThisWeek,
      sessionsThisMonth,
      recentSessions,
    ] = await Promise.all([

      prisma.treatmentSession.count({
        where: {
          encounter:     { ...branchFilter },
          treatmentDate: { gte: todayStart, lte: todayEnd },
        },
      }),

      prisma.treatmentSession.count({
        where: {
          encounter: { ...branchFilter },
          status:    "IN_PROGRESS",
        },
      }),

      prisma.treatmentSession.count({
        where: {
          encounter:     { ...branchFilter },
          status:        "COMPLETED",
          treatmentDate: { gte: weekStart, lte: todayEnd },
        },
      }),

      prisma.treatmentSession.count({
        where: {
          encounter:     { ...branchFilter },
          status:        "COMPLETED",
          treatmentDate: { gte: monthStart, lte: todayEnd },
        },
      }),

      // FIX: infusionExecution adalah one-to-one → select langsung, bukan _count
      prisma.treatmentSession.findMany({
        where: {
          encounter:     { ...branchFilter },
          treatmentDate: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { treatmentDate: "desc" },
        take: 10,
        select: {
          treatmentSessionId: true,
          infusKe:            true,
          status:             true,
          treatmentDate:      true,
          pelaksanaan:        true,

          // vitalSigns adalah list relation → bisa _count ✅
          _count: {
            select: { vitalSigns: true },
          },

          // infusionExecution adalah one-to-one → select langsung ✅
          infusionExecution: {
            select: { infusionExecutionId: true },
          },

          // encounter → branch & member
          encounter: {
            select: {
              encounterId: true,
              branch:  { select: { name: true } },
              member:  { select: { memberNo: true, fullName: true } },
            },
          },
        },
      }),
    ]);

    // ── Response mapping ─────────────────────────────────────────────────────
    const stats = {
      sessionsToday,
      sessionInProgress,
      sessionsThisWeek,
      sessionsThisMonth,
    };

    const recentSessionsMapped = recentSessions.map((s) => ({
      treatmentSessionId: s.treatmentSessionId,
      infusKe:            s.infusKe,
      status:             s.status,
      treatmentDate:      s.treatmentDate.toISOString(),
      pelaksanaan:        s.pelaksanaan,

      // FIX: _count.vitalSigns (list ✅), infusionExecution !== null (one-to-one ✅)
      hasVitalSigns: s._count.vitalSigns > 0,
      hasInfusion:   s.infusionExecution !== null,

      encounter: {
        encounterId: s.encounter.encounterId,
        member: {
          memberNo: s.encounter.member.memberNo,
          fullName: s.encounter.member.fullName,
        },
        branch: {
          name: s.encounter.branch.name,
        },
      },
    }));

    sendSuccess(res, { stats, recentSessions: recentSessionsMapped });
  } catch (err) {
    next(err);
  }
};