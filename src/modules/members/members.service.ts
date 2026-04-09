import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { assertMemberAccess } from "../../utils/memberAccess";
import type { RequestUser } from "../../types/express";
import { RoleName } from "../../generated/prisma";

const GLOBAL_ROLES = [RoleName.SUPER_ADMIN, RoleName.ADMIN_MANAGER] as const;

export const listMembersService = async (user: RequestUser) => {
  const isGlobal = GLOBAL_ROLES.includes(user.roleName as (typeof GLOBAL_ROLES)[number]);
  const branchFilter = isGlobal ? {} : { registrationBranchId: user.branchId! };

  return prisma.member.findMany({
    where: { ...branchFilter },
    orderBy: { fullName: "asc" },
    select: {
      memberId:          true,
      memberNo:          true,
      fullName:          true,
      phone:             true,
      email:             true,
      status:            true,
      voucherCount:      true,
      isConsentToPhoto:  true,
      isDeceased:        true,
      registrationBranch: { select: { branchId: true, branchCode: true, name: true } },
      encounters: {
        orderBy: { createdAt: "desc" },
        select: {
          encounterId:   true,
          type:          true,
          status:        true,
          treatmentDate: true,
          createdAt:     true,
        },
      },
    },
  });
};

export const getMemberByIdService = async (memberId: string, user: RequestUser) => {
  const member = await prisma.member.findUnique({
    where: { memberId },
    include: {
      registrationBranch: { select: { branchId: true, branchCode: true, name: true } },
      branchAccesses:     { where: { branchId: user.branchId!, isActive: true } },
      encounters:         { orderBy: { createdAt: "desc" } },
    },
  });

  if (!member) throw new AppError("Member tidak ditemukan", 404);
  return member;
};

export const listMemberSessionsService = async (memberId: string, user: RequestUser) => {
  await assertMemberAccess(memberId, user);

  return prisma.treatmentSession.findMany({
    where:   { encounter: { memberId } },
    orderBy: { treatmentDate: "desc" },
    select: {
      treatmentSessionId: true,
      infusKe:            true,
      status:             true,
      treatmentDate:      true,
      pelaksanaan:        true,
      startedAt:          true,
      completedAt:        true,
      berhasilInfus:      true,
      encounter: {
        select: {
          encounterId: true,
          branch:      { select: { name: true } },
        },
      },
      nurse: {
        select: { userId: true, profile: { select: { fullName: true } } },
      },
      _count: { select: { vitalSigns: true } },
    },
  });
};