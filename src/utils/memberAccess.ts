import { prisma }          from "@/config/prisma";      // ← named import
import { AppError }        from "@/utils/AppError";
import { RoleName }        from "@/generated/prisma";   // ← bukan @prisma/client
import type { RequestUser } from "@/types/express";

const GLOBAL_ROLES: RoleName[] = [
  "SUPER_ADMIN",   // ← bukan RoleName.SUPERADMIN
  "ADMIN_MANAGER", // ← bukan RoleName.ADMINMANAGER
];

export const assertMemberAccess = async (
  memberId: string,
  user: RequestUser
): Promise<void> => {
  if (GLOBAL_ROLES.includes(user.roleName)) return;

  const member = await prisma.member.findUnique({
    where: { memberId },
    include: {
      branchAccesses: {
        where: {
          branchId: user.branchId!,
          isActive: true,
        },
      },
    },
  });

  if (!member) throw new AppError("Member tidak ditemukan", 404);

  const isRegistrationBranch = member.registrationBranchId === user.branchId;
  const hasAccess            = member.branchAccesses.length > 0;

  if (!isRegistrationBranch && !hasAccess) {
    throw new AppError(
      "Akses ditolak: member ini tidak terdaftar di cabang Anda. " +
      "Minta member untuk memberikan kode akun mereka.",
      403
    );
  }
};

export const lookupMemberByNo = async (
  memberNo: string,
  user: RequestUser
) => {
  const member = await prisma.member.findUnique({
    where: { memberNo },
    select: {
      memberId:             true,
      memberNo:             true,
      fullName:             true,
      registrationBranchId: true,
      registrationBranch: {
        select: { name: true, branchCode: true },
      },
      branchAccesses: {
        where:  { branchId: user.branchId!, isActive: true },
        select: { accessId: true, grantedAt: true },
      },
    },
  });

  if (!member) throw new AppError("Kode akun member tidak ditemukan", 404);

  return {
    memberId:           member.memberId,
    memberNo:           member.memberNo,
    fullName:           member.fullName,
    registrationBranch: member.registrationBranch,
    sudahAdaAkses:      member.branchAccesses.length > 0,
  };
};

export const grantBranchAccess = async (
  memberId: string,
  notes:    string | undefined,
  user:     RequestUser
): Promise<void> => {
  const member = await prisma.member.findUnique({
    where: { memberId },
    include: {
      branchAccesses: {
        where: { branchId: user.branchId!, isActive: true },
      },
    },
  });

  if (!member) throw new AppError("Member tidak ditemukan", 404);

  if (member.branchAccesses.length > 0)
    throw new AppError("Member sudah memiliki akses di cabang ini", 409);

  if (member.registrationBranchId === user.branchId)
    throw new AppError(
      "Member sudah terdaftar di cabang ini, tidak perlu grant akses",
      400
    );

  await prisma.branchMemberAccess.create({
    data: {
      memberId,
      branchId:  user.branchId!,
      grantedBy: user.userId,
      isActive:  true,
      notes,
    },
  });
};