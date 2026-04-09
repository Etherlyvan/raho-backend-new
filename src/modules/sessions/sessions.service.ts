import { prisma } from "../../config/prisma";    // ← named import
import { AppError }           from "../../utils/AppError";
import { assertMemberAccess }  from "@/utils/memberAccess";
import { RoleName }            from "@/generated/prisma";   // ← bukan @prisma/client
import type { RequestUser }    from "../../types/express";

const GLOBAL_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN_MANAGER",
];

export const checkSessionAccess = async (
  sessionId: string,
  user: RequestUser
) => {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId: sessionId },
    include: {
      encounter: {
        include: {
          branch:  { select: { branchId: true, branchCode: true, name: true } },
          member:  { select: { memberId: true, memberNo: true, fullName: true } },
          doctor:  { select: { userId: true, profile: { select: { fullName: true } } } },
        },
      },
      nurse:             { select: { userId: true, profile: { select: { fullName: true } } } },
      therapyPlan:       true,
      infusionExecution: true,   // ← FIX: tambah ini
    },
  });

  if (!session) throw new AppError("Sesi tidak ditemukan", 404);

  if (!GLOBAL_ROLES.includes(user.roleName)) {
    if (session.encounter.branchId !== user.branchId) {
      throw new AppError("Akses ditolak: sesi bukan milik cabang Anda", 403);
    }
    await assertMemberAccess(session.encounter.member.memberId, user);
  }

  return session;
};

export const getSessionDetail = async (
  sessionId: string,
  user:      RequestUser
) => checkSessionAccess(sessionId, user);