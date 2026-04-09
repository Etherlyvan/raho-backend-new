import {prisma} from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { logAudit } from '../../utils/auditLog.helper';
import { assertMemberAccess } from '../../utils/memberAccess';
import { generatePlanCode } from '../../utils/generatePlanCode';
import type { RoleName } from '../../generated/prisma';

// ─── Actor type (hanya field yang dipakai service) ────────────────────────────

interface Actor {
  userId:    string;
  roleName:  RoleName;
  branchId:  string | null;
}

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface TherapyPlanPayload {
  ifaMg?:      number;
  hhoMl?:      number;
  h2Ml?:       number;
  noMl?:       number;
  gasoMl?:     number;
  o2Ml?:       number;
  o3Ml?:       number;
  edtaMl?:     number;
  mbMl?:       number;
  h2sMl?:      number;
  kclMl?:      number;
  jmlNbMl?:    number;
  keterangan?: string;
}

export interface TherapyHistoryQuery {
  page:  number;
  limit: number;
}

// ─── Select helper ────────────────────────────────────────────────────────────

const PLANNER_SELECT = {
  userId:  true,
  profile: { select: { fullName: true } },
} as const;

// ─── Guard: ambil sesi + validasi akses member ────────────────────────────────

async function getSessionOrThrow(sessionId: string, actor: Actor) {
  const session = await prisma.treatmentSession.findUnique({
    where:   { treatmentSessionId: sessionId },
    include: {
      encounter: {
        include: {
          member: {
            include: {
              registrationBranch: true,
              branchAccesses:     { where: { isActive: true } },
            },
          },
          branch: { select: { branchId: true, branchCode: true, name: true } },
        },
      },
    },
  });

  if (!session) throw new AppError('Sesi tidak ditemukan.', 404);

  // assertMemberAccess(memberId: string, user: RequestUser) — 2 argumen
  await assertMemberAccess(session.encounter.member.memberId, {
    userId:   actor.userId,
    roleId:   '',           // tidak dipakai oleh assertMemberAccess
    roleName: actor.roleName,
    branchId: actor.branchId,
  });

  return session;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getTherapyPlan(sessionId: string, actor: Actor) {
  await getSessionOrThrow(sessionId, actor);

  return prisma.sessionTherapyPlan.findUnique({
    where:   { treatmentSessionId: sessionId },
    include: { planner: { select: PLANNER_SELECT } },
  });
}

export async function createTherapyPlan(
  sessionId: string,
  payload:   TherapyPlanPayload,
  actor:     Actor,
) {
  const session = await getSessionOrThrow(sessionId, actor);

  const existing = await prisma.sessionTherapyPlan.findUnique({
    where:  { treatmentSessionId: sessionId },
    select: { sessionTherapyPlanId: true },
  });
  if (existing) throw new AppError('Terapi plan untuk sesi ini sudah ada.', 409);

  const planCode = await generatePlanCode(session.encounter.branch.branchCode);

  const plan = await prisma.sessionTherapyPlan.create({
    data:    { treatmentSessionId: sessionId, planCode, plannedBy: actor.userId, ...payload },
    include: { planner: { select: PLANNER_SELECT } },
  });

  await logAudit({
    userId:     actor.userId,
    action:     'CREATE',
    resource:   'SessionTherapyPlan',
    resourceId: plan.sessionTherapyPlanId,
    meta:       { planCode, sessionId },
  });

  return plan;
}

export async function updateTherapyPlan(
  sessionId: string,
  payload:   Partial<TherapyPlanPayload>,
  actor:     Actor,
) {
  await getSessionOrThrow(sessionId, actor);

  const existing = await prisma.sessionTherapyPlan.findUnique({
    where: { treatmentSessionId: sessionId },
  });
  if (!existing) throw new AppError('Terapi plan tidak ditemukan.', 404);

  const updated = await prisma.sessionTherapyPlan.update({
    where:   { treatmentSessionId: sessionId },
    data:    payload,
    include: { planner: { select: PLANNER_SELECT } },
  });

  await logAudit({
    userId:     actor.userId,
    action:     'UPDATE',
    resource:   'SessionTherapyPlan',
    resourceId: existing.sessionTherapyPlanId,
    meta:       { before: existing, after: payload },
  });

  return updated;
}

export async function deleteTherapyPlan(sessionId: string, actor: Actor) {
  await getSessionOrThrow(sessionId, actor);

  const existing = await prisma.sessionTherapyPlan.findUnique({
    where:  { treatmentSessionId: sessionId },
    select: { sessionTherapyPlanId: true, planCode: true },
  });
  if (!existing) throw new AppError('Terapi plan tidak ditemukan.', 404);

  await prisma.sessionTherapyPlan.delete({ where: { treatmentSessionId: sessionId } });

  await logAudit({
    userId:     actor.userId,
    action:     'DELETE',
    resource:   'SessionTherapyPlan',
    resourceId: existing.sessionTherapyPlanId,
    meta:       { planCode: existing.planCode, sessionId },
  });
}

export async function getTherapyHistory(
  memberId: string,
  actor:    Actor,
  { page, limit }: TherapyHistoryQuery,
) {
  const member = await prisma.member.findUnique({
    where:   { memberId },
    include: {
      registrationBranch: true,
      branchAccesses:     { where: { isActive: true } },
    },
  });
  if (!member) throw new AppError('Member tidak ditemukan.', 404);

  await assertMemberAccess(memberId, {
    userId:   actor.userId,
    roleId:   '',
    roleName: actor.roleName,
    branchId: actor.branchId,
  });

  const where = {
    encounter:   { memberId },
    therapyPlan: { isNot: null },
  } as const;

  const [sessions, total] = await prisma.$transaction([
    prisma.treatmentSession.findMany({
      where,
      include: {
        therapyPlan: { include: { planner: { select: PLANNER_SELECT } } },
        encounter: {
          select: {
            encounterId: true,
            branch: { select: { branchId: true, branchCode: true, name: true } },
          },
        },
      },
      orderBy: { treatmentDate: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.treatmentSession.count({ where }),
  ]);

  return {
    data:       sessions,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}