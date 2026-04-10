import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { assertMemberAccess } from '../../utils/memberAccess';
import { SessionStatus, RoleName } from '../../generated/prisma';
import type { RequestUser } from '../../types/express';

const GLOBAL_ROLES: RoleName[] = ['SUPER_ADMIN', 'ADMIN_MANAGER'];

const ALLOWED_TRANSITIONS: Record<SessionStatus, {
  to: SessionStatus[];
  roles: RoleName[];
}> = {
  PLANNED: {
    to: ['IN_PROGRESS'],
    roles: ['NURSE', 'DOCTOR', 'ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'],
  },
  IN_PROGRESS: {
    to: ['COMPLETED', 'POSTPONED'],
    roles: ['NURSE', 'DOCTOR', 'ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'],
  },
  POSTPONED: {
    to: ['PLANNED'],
    roles: ['ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'],
  },
  COMPLETED: {
    to: [],
    roles: [],
  },
};

export const updateSessionStatusService = async (
  sessionId: string,
  newStatus: string,
  user: RequestUser,
): Promise<{ treatmentSessionId: string; status: SessionStatus; updatedAt: string }> => {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId: sessionId },
    select: {
      status: true,
      encounter: { select: { memberId: true } },
    },
  });

  if (!session) throw new AppError('Sesi tidak ditemukan.', 404);

  await assertMemberAccess(session.encounter.memberId, user);

  const currentStatus = session.status as SessionStatus;
  const targetStatus = newStatus as SessionStatus;
  const rule = ALLOWED_TRANSITIONS[currentStatus];

  if (!rule || !rule.to.includes(targetStatus)) {
    throw new AppError(`Transisi ${currentStatus} → ${newStatus} tidak diizinkan.`, 422);
  }

  if (!rule.roles.includes(user.roleName)) {
    throw new AppError(`Role ${user.roleName} tidak dapat melakukan transisi ini.`, 403);
  }

  const extra: { startedAt?: Date; completedAt?: Date } = {};
  if (targetStatus === 'IN_PROGRESS') extra.startedAt = new Date();
  if (targetStatus === 'COMPLETED') extra.completedAt = new Date();

  const updated = await prisma.treatmentSession.update({
    where: { treatmentSessionId: sessionId },
    data: {
      status: targetStatus,
      ...extra,
    },
    select: {
      treatmentSessionId: true,
      status: true,
      updatedAt: true,
    },
  });

  return {
    treatmentSessionId: updated.treatmentSessionId,
    status: updated.status,
    updatedAt: updated.updatedAt.toISOString(),
  };
};

export const checkSessionAccess = async (
  sessionId: string,
  user: RequestUser,
) => {
  const session = await prisma.treatmentSession.findUnique({
    where: { treatmentSessionId: sessionId },
    include: {
      encounter: {
        include: {
          branch: { select: { branchId: true, branchCode: true, name: true } },
          member: { select: { memberId: true, memberNo: true, fullName: true } },
          doctor: { select: { userId: true, profile: { select: { fullName: true } } } },
        },
      },
      nurse: { select: { userId: true, profile: { select: { fullName: true } } } },
      therapyPlan: true,
      infusionExecution: true,
    },
  });

  if (!session) throw new AppError('Sesi tidak ditemukan', 404);

  if (!GLOBAL_ROLES.includes(user.roleName)) {
    if (session.encounter.branchId !== user.branchId) {
      throw new AppError('Akses ditolak: sesi bukan milik cabang Anda', 403);
    }
    await assertMemberAccess(session.encounter.memberId, user);
  }

  return session;
};

export const getSessionDetail = async (sessionId: string, user: RequestUser) =>
  checkSessionAccess(sessionId, user);

export const listSessions = async (user: RequestUser) => {
  const isGlobal = GLOBAL_ROLES.includes(user.roleName);

  const sessions = await prisma.treatmentSession.findMany({
    where: {
      encounter: isGlobal ? {} : { branchId: user.branchId! },
    },
    orderBy: { treatmentDate: 'desc' },
    take: 50,
    select: {
      treatmentSessionId: true,
      infusKe: true,
      status: true,
      treatmentDate: true,
      pelaksanaan: true,
      encounter: {
        select: {
          encounterId: true,
          member: { select: { memberNo: true, fullName: true } },
          branch: { select: { name: true } },
        },
      },
    },
  });

  return sessions.map(s => ({
    ...s,
    treatmentDate: s.treatmentDate.toISOString(),
  }));
};