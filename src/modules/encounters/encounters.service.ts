import {
  PrismaClient,
  EncounterType,
  EncounterStatus,
  SessionStatus,
  MemberPackageStatus,
  PelaksanaanType,
} from '../../generated/prisma';
import { AppError }              from '../../utils/AppError';
import { assertMemberAccess }    from '../../utils/memberAccess';
// ✅ FIX: auditLog.helper
import { logAudit }              from '../../utils/auditLog.helper';
import {
  generateEncounterCode,
  generateSessionCode,
} from '../../utils/generateCode';
import type { RequestUser }      from '../../types/express';

const prisma = new PrismaClient();

// ─── List Encounter ───────────────────────────────────────────────────────────
// ✅ FIX: terima user: RequestUser
export async function listEncounters(memberId: string, user: RequestUser) {
  await assertMemberAccess(memberId, user);   // ✅ 2 args

  const encounters = await prisma.encounter.findMany({
    where:   { memberId },
    include: {
      branch:   true,
      doctor:   { include: { profile: true } },
      sessions: { orderBy: { infusKe: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return encounters.map((enc) => ({
    ...enc,
    encounterCode: generateEncounterCode(
      enc.branch.branchCode, enc.type, enc.encounterId, enc.createdAt,
    ),
    sessions: enc.sessions.map((s) => ({
      ...s,
      sessionCode: generateSessionCode(
        enc.branch.branchCode, s.infusKe ?? 0, s.treatmentSessionId, s.createdAt,
      ),
    })),
  }));
}

// ─── Buat Encounter ───────────────────────────────────────────────────────────
// ✅ FIX: terima user: RequestUser
export async function createEncounter(
  memberId : string,
  user     : RequestUser,
  payload  : {
    type            : EncounterType;
    memberPackageId : string;
    doctorId        : string;
    treatmentDate   : string;
    notes?          : string;
  },
) {
  await assertMemberAccess(memberId, user);   // ✅ 2 args

  const [memberPackage, doctor] = await Promise.all([
    prisma.memberPackage.findFirst({
      where:   { memberPackageId: payload.memberPackageId, memberId },
      include: { branch: true },
    }),
    prisma.user.findFirst({
      where: { userId: payload.doctorId, role: { name: 'DOCTOR' } },
    }),
  ]);

  if (!memberPackage) throw new AppError('Paket tidak ditemukan', 404);
  if (!doctor)        throw new AppError('Dokter tidak ditemukan', 404);

  if (
    payload.type === EncounterType.TREATMENT &&
    memberPackage.status !== MemberPackageStatus.ACTIVE
  ) {
    throw new AppError('Paket harus ACTIVE untuk membuat encounter TREATMENT', 422);
  }

  const encounter = await prisma.encounter.create({
    data: {
      memberId,
      doctorId:        payload.doctorId,
      branchId:        user.branchId!,
      memberPackageId: payload.memberPackageId,
      type:            payload.type,
      status:          EncounterStatus.PLANNED,
      treatmentDate:   new Date(payload.treatmentDate),
      assessment:      payload.notes ? { notes: payload.notes } : undefined,
    },
    include: { branch: true, doctor: { include: { profile: true } } },
  });

  await logAudit({
    userId:     user.userId,
    action:     'CREATE',
    resource:   'Encounter',
    resourceId: encounter.encounterId,
    meta:       { memberId, type: encounter.type },
  });

  return {
    ...encounter,
    encounterCode: generateEncounterCode(
      encounter.branch.branchCode, encounter.type,
      encounter.encounterId, encounter.createdAt,
    ),
  };
}

// ─── Buat Session ─────────────────────────────────────────────────────────────
// ✅ FIX: terima user: RequestUser
export async function createSession(
  encounterId : string,
  user        : RequestUser,
  payload     : {
    treatmentDate : string;
    pelaksanaan?  : PelaksanaanType;
    nurseId?      : string;
  },
) {
  const encounter = await prisma.encounter.findFirst({
    where:   { encounterId },
    include: { branch: true },
  });
  if (!encounter) throw new AppError('Encounter tidak ditemukan', 404);

  await assertMemberAccess(encounter.memberId, user);   // ✅ 2 args

  const member = await prisma.member.findUnique({
    where: { memberId: encounter.memberId },
  });
  if (!member || member.voucherCount <= 0) {
    throw new AppError('Voucher habis. Assign paket baru terlebih dahulu.', 422);
  }

  const lastSession = await prisma.treatmentSession.findFirst({
    where:   { encounterId },
    orderBy: { infusKe: 'desc' },
  });
  const infusKe = (lastSession?.infusKe ?? 0) + 1;

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.treatmentSession.create({
      data: {
        encounterId,
        nurseId:       payload.nurseId,
        pelaksanaan:   payload.pelaksanaan,
        infusKe,
        treatmentDate: new Date(payload.treatmentDate),
        status:        SessionStatus.PLANNED,
      },
    });

    await tx.member.update({
      where: { memberId: encounter.memberId },
      data:  { voucherCount: { decrement: 1 } },
    });

    if (encounter.status === EncounterStatus.PLANNED) {
      await tx.encounter.update({
        where: { encounterId },
        data:  { status: EncounterStatus.ONGOING },
      });
    }

    return created;
  });

  await logAudit({
    userId:     user.userId,
    action:     'CREATE',
    resource:   'TreatmentSession',
    resourceId: session.treatmentSessionId,
    meta:       { encounterId, infusKe, voucherDecremented: 1 },
  });

  return {
    ...session,
    sessionCode: generateSessionCode(
      encounter.branch.branchCode, infusKe,
      session.treatmentSessionId, session.createdAt,
    ),
  };
}