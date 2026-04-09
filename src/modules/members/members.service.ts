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



export interface TherapyHistoryRow {
  treatmentSessionId: string;
  infusKe:            number | null;
  treatmentDate:      string;
  status:             string;
  planCode:           string | null;
  ifaMg:              number | null;
  hhoMl:              number | null;
  h2Ml:               number | null;
  noMl:               number | null;
  gasoMl:             number | null;
  o2Ml:               number | null;
  o3Ml:               number | null;
  edtaMl:             number | null;
  mbMl:               number | null;
  h2sMl:              number | null;
  kclMl:              number | null;
  jmlNbMl:            number | null;
  keterangan:         string | null;
  plannedBy:          string | null;  // fullName dokter
  plannedAt:          string | null;
  hasInfusion:        boolean;
  deviationNote:      string | null;
}

export const getTherapyHistoryService = async (
  memberId: string,
  user: RequestUser,
  page  = 1,
  limit = 20,
): Promise<{ data: TherapyHistoryRow[]; total: number; page: number; limit: number }> => {
  // Guard akses member
  await assertMemberAccess(memberId, user);

  const skip = (page - 1) * limit;

  // Hanya sesi yang punya TherapyPlan
  const where = {
    encounter:   { memberId },
    therapyPlan: { isNot: null },
  } as const;

  const [total, sessions] = await Promise.all([
    prisma.treatmentSession.count({ where }),
    prisma.treatmentSession.findMany({
      where,
      orderBy: { treatmentDate: 'desc' },
      skip,
      take:    limit,
      select: {
        treatmentSessionId: true,
        infusKe:            true,
        treatmentDate:      true,
        status:             true,
        therapyPlan: {
          select: {
            planCode:    true,
            ifaMg:       true,
            hhoMl:       true,
            h2Ml:        true,
            noMl:        true,
            gasoMl:      true,
            o2Ml:        true,
            o3Ml:        true,
            edtaMl:      true,
            mbMl:        true,
            h2sMl:       true,
            kclMl:       true,
            jmlNbMl:     true,
            keterangan:  true,
            plannedAt:   true,
            planner: { select: { profile: { select: { fullName: true } } } },
          },
        },
        infusionExecution: {
          select: {
            infusionExecutionId: true,
            deviationNote:       true,
          },
        },
      },
    }),
  ]);

  const data: TherapyHistoryRow[] = sessions.map(s => ({
    treatmentSessionId: s.treatmentSessionId,
    infusKe:            s.infusKe,
    treatmentDate:      s.treatmentDate.toISOString(),
    status:             s.status,
    planCode:           s.therapyPlan?.planCode           ?? null,
    ifaMg:              s.therapyPlan?.ifaMg              ?? null,
    hhoMl:              s.therapyPlan?.hhoMl              ?? null,
    h2Ml:               s.therapyPlan?.h2Ml               ?? null,
    noMl:               s.therapyPlan?.noMl               ?? null,
    gasoMl:             s.therapyPlan?.gasoMl             ?? null,
    o2Ml:               s.therapyPlan?.o2Ml               ?? null,
    o3Ml:               s.therapyPlan?.o3Ml               ?? null,
    edtaMl:             s.therapyPlan?.edtaMl             ?? null,
    mbMl:               s.therapyPlan?.mbMl               ?? null,
    h2sMl:              s.therapyPlan?.h2sMl              ?? null,
    kclMl:              s.therapyPlan?.kclMl              ?? null,
    jmlNbMl:            s.therapyPlan?.jmlNbMl            ?? null,
    keterangan:         s.therapyPlan?.keterangan         ?? null,
    plannedBy:          s.therapyPlan?.planner?.profile?.fullName ?? null,
    plannedAt:          s.therapyPlan?.plannedAt.toISOString()    ?? null,
    hasInfusion:        !!s.infusionExecution,
    deviationNote:      s.infusionExecution?.deviationNote        ?? null,
  }));

  return { data, total, page, limit };
};