import { prisma }                   from '../../config/prisma';
import { AppError }                 from '../../utils/AppError';
import { generateEvaluationCode }   from '../../utils/generateEvaluationCode';
import { assertMemberAccess }       from '../../utils/memberAccess';
import type { UpsertEvaluationInput } from './evaluation.validator';
import type { EvaluationResponse }    from './evaluation.types';
import type { RequestUser }           from '../../types/express';

// ─── Helper mapper ────────────────────────────────────────────────────────────

function toResponse(ev: {
  doctorEvaluationId: string;
  evaluationCode:     string | null;
  treatmentSessionId: string;
  doctorId:           string;
  doctor:             { profile: { fullName: string } | null } | null;
  subjective:         string | null;
  objective:          string | null;
  assessment:         string | null;
  plan:               string | null;
  evaluasiDokter:     string | null;
  createdAt:          Date;
  updatedAt:          Date;
}): EvaluationResponse {
  return {
    doctorEvaluationId: ev.doctorEvaluationId,
    evaluationCode:     ev.evaluationCode ?? '',
    sessionId:          ev.treatmentSessionId,
    doctorId:           ev.doctorId,
    doctorName:         ev.doctor?.profile?.fullName ?? null,
    subjective:         ev.subjective,
    objective:          ev.objective,
    assessment:         ev.assessment,
    plan:               ev.plan,
    evaluasiDokter:     ev.evaluasiDokter,
    createdAt:          ev.createdAt.toISOString(),
    updatedAt:          ev.updatedAt.toISOString(),
  };
}

const EVAL_SELECT = {
  doctorEvaluationId: true,
  evaluationCode:     true,
  treatmentSessionId: true,
  doctorId:           true,
  doctor:             { select: { profile: { select: { fullName: true } } } },
  subjective:         true,
  objective:          true,
  assessment:         true,
  plan:               true,
  evaluasiDokter:     true,
  createdAt:          true,
  updatedAt:          true,
} as const;

// ─── GET ──────────────────────────────────────────────────────────────────────

export const getEvaluationService = async (
  sessionId: string,
  user: RequestUser,
): Promise<EvaluationResponse | null> => {
  const session = await prisma.treatmentSession.findUnique({
    where:  { treatmentSessionId: sessionId },
    select: { encounter: { select: { memberId: true } } },
  });
  if (!session) throw new AppError('Sesi tidak ditemukan.', 404);

  await assertMemberAccess(session.encounter.memberId, user);

  const ev = await prisma.doctorEvaluation.findUnique({
    where:  { treatmentSessionId: sessionId },
    select: EVAL_SELECT,
  });

  return ev ? toResponse(ev) : null;
};

// ─── UPSERT (create or update) ────────────────────────────────────────────────

export const upsertEvaluationService = async (
  sessionId: string,
  dto: UpsertEvaluationInput,
  user: RequestUser,
): Promise<EvaluationResponse> => {
  // Validasi sesi
  const session = await prisma.treatmentSession.findUnique({
    where:  { treatmentSessionId: sessionId },
    select: {
      status:   true,
      encounter: { select: { memberId: true, branchId: true } },
    },
  });
  if (!session) throw new AppError('Sesi tidak ditemukan.', 404);

  // Hanya bisa evaluasi sesi yang sudah/sedang berjalan
  if (!['INPROGRESS', 'COMPLETED'].includes(session.status)) {
    throw new AppError(
      `Evaluasi hanya bisa diisi saat sesi INPROGRESS atau COMPLETED. Status saat ini: ${session.status}.`,
      422,
    );
  }

  await assertMemberAccess(session.encounter.memberId, user);

  // Hanya DOCTOR yang boleh upsert evaluasi
  if (!['DOCTOR', 'SUPERADMIN'].includes(user.roleName)) {
    throw new AppError('Hanya dokter yang dapat mengisi evaluasi.', 403);
  }

  const existing = await prisma.doctorEvaluation.findUnique({
    where:  { treatmentSessionId: sessionId },
    select: { doctorEvaluationId: true },
  });

  let ev;

  if (existing) {
    // UPDATE
    ev = await prisma.doctorEvaluation.update({
      where:  { treatmentSessionId: sessionId },
      data:   { ...dto },
      select: EVAL_SELECT,
    });
  } else {
    // CREATE — generate kode unik
    const evaluationCode = await generateEvaluationCode(session.encounter.branchId);
    ev = await prisma.doctorEvaluation.create({
      data: {
        treatmentSessionId: sessionId,
        doctorId:           user.userId,
        evaluationCode,
        ...dto,
      },
      select: EVAL_SELECT,
    });
  }

  return toResponse(ev);
};