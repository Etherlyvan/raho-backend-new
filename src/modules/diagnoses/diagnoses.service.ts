import { prisma }                from "../../config/prisma";
import { AppError }              from "../../utils/AppError";
import { logAudit }              from "../../utils/auditLog.helper";
import { assertMemberAccess }    from "../../utils/memberAccess";
import { generateDiagnosisCode } from "../../utils/generateDiagnosisCode";
import type { RequestUser }      from "../../types/express";
import type { Request }          from "express";
import { Prisma }                from "../../generated/prisma";

// ── Prisma include — TANPA dokterUser (bukan relasi di schema) ─────────────────
const INCLUDE_FULL = {
  encounter: {
    select: {
      encounterId : true,
      member      : { select: { memberId: true, memberNo: true, fullName: true } },
      branch      : { select: { branchId: true, branchCode: true, name: true } },
    },
  },
} as const;

// ── Helper: resolve dokterUser dari doktorPemeriksa (String userId) ────────────
async function resolveDokterUser(userId: string) {
  const user = await prisma.user.findUnique({
    where  : { userId },
    select : { userId: true, profile: { select: { fullName: true } } },
  });
  return user ?? null;
}

async function withDokterUser<T extends { doktorPemeriksa: string }>(item: T) {
  return { ...item, dokterUser: await resolveDokterUser(item.doktorPemeriksa) };
}

async function withDokterUsers<T extends { doktorPemeriksa: string }>(items: T[]) {
  const ids      = [...new Set(items.map((d) => d.doktorPemeriksa))];
  const users    = await prisma.user.findMany({
    where  : { userId: { in: ids } },
    select : { userId: true, profile: { select: { fullName: true } } },
  });
  const userMap  = Object.fromEntries(users.map((u) => [u.userId, u]));
  return items.map((d) => ({ ...d, dokterUser: userMap[d.doktorPemeriksa] ?? null }));
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function getEncounterWithAccess(encounterId: string, actor: RequestUser) {
  const encounter = await prisma.encounter.findUnique({
    where  : { encounterId },
    include: {
      member : { select: { memberId: true } },
      branch : { select: { branchId: true } },
    },
  });
  if (!encounter) throw new AppError("Encounter tidak ditemukan", 404);

  const GLOBAL_ROLES = ["SUPERADMIN", "ADMINMANAGER"] as const;
  if (
    !GLOBAL_ROLES.includes(actor.roleName as never) &&
    actor.branchId !== encounter.branch.branchId
  ) {
    throw new AppError("Akses ditolak: encounter bukan milik cabang Anda", 403);
  }

  await assertMemberAccess(encounter.member.memberId, actor);
  return encounter;
}

// ── Service ────────────────────────────────────────────────────────────────────
export class DiagnosisService {

  /** GET /encounters/:encounterId/diagnoses */
  async listByEncounter(encounterId: string, actor: RequestUser) {
    await getEncounterWithAccess(encounterId, actor);

    const diagnoses = await prisma.diagnosis.findMany({
      where  : { encounterId },
      include: INCLUDE_FULL,
      orderBy: { createdAt: "desc" },
    });

    return withDokterUsers(diagnoses); // batch resolve — 1 query untuk semua dokter
  }

  /** POST /encounters/:encounterId/diagnoses */
  async create(
    encounterId : string,
    body        : CreateDiagnosisBody,
    actor       : RequestUser,
    req         : Request,
  ) {
    const encounter = await getEncounterWithAccess(encounterId, actor);

    const dokter = await prisma.user.findUnique({
      where  : { userId: body.doktorPemeriksa },
      include: { role: { select: { name: true } } },
    });
    if (!dokter) throw new AppError("Dokter pemeriksa tidak ditemukan", 404);
    if (dokter.role.name !== "DOCTOR") {
      throw new AppError("doktorPemeriksa harus berole DOCTOR", 422);
    }

    const diagnosisCode = await generateDiagnosisCode(encounter.branch.branchId);

    const diagnosis = await prisma.diagnosis.create({
      data: {
        diagnosisCode,
        encounterId,
        doktorPemeriksa          : body.doktorPemeriksa,
        diagnosa                 : body.diagnosa,
        kategoriDiagnosa         : body.kategoriDiagnosa         ?? null,
        icdPrimer                : body.icdPrimer                ?? null,
        icdSekunder              : body.icdSekunder              ?? null,
        icdTersier               : body.icdTersier               ?? null,
        keluhanRiwayatSekarang   : body.keluhanRiwayatSekarang   ?? null,
        riwayatPenyakitTerdahulu : body.riwayatPenyakitTerdahulu ?? null,
        riwayatSosialKebiasaan   : body.riwayatSosialKebiasaan   ?? null,
        riwayatPengobatan        : body.riwayatPengobatan        ?? null,
        pemeriksaanFisik         : body.pemeriksaanFisik         ?? null,
        pemeriksaanTambahan: (body.pemeriksaanTambahan ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
      include: INCLUDE_FULL,
    });

    await logAudit({
      userId    : actor.userId,
      action    : "CREATE",
      resource  : "Diagnosis",
      resourceId: diagnosis.diagnosisId,
      meta      : { diagnosisCode, encounterId },
      req,
    });

    return withDokterUser(diagnosis);
  }

  /** GET /diagnoses/:diagnosisId */
  async getById(diagnosisId: string, actor: RequestUser) {
    const diagnosis = await prisma.diagnosis.findUnique({
      where  : { diagnosisId },
      include: INCLUDE_FULL,
    });
    if (!diagnosis) throw new AppError("Diagnosis tidak ditemukan", 404);

    await assertMemberAccess(diagnosis.encounter.member.memberId, actor);
    return withDokterUser(diagnosis);
  }

  /** PATCH /diagnoses/:diagnosisId — SUPERADMIN only */
  async update(
    diagnosisId : string,
    body        : Partial<CreateDiagnosisBody>,
    actor       : RequestUser,
    req         : Request,
  ) {
    const existing = await prisma.diagnosis.findUnique({ where: { diagnosisId } });
    if (!existing) throw new AppError("Diagnosis tidak ditemukan", 404);

    const diagnosis = await prisma.diagnosis.update({
      where : { diagnosisId },
      data  : {
        doktorPemeriksa          : body.doktorPemeriksa          ?? undefined,
        diagnosa                 : body.diagnosa                 ?? undefined,
        kategoriDiagnosa         : body.kategoriDiagnosa         ?? undefined,
        icdPrimer                : body.icdPrimer                ?? undefined,
        icdSekunder              : body.icdSekunder              ?? undefined,
        icdTersier               : body.icdTersier               ?? undefined,
        keluhanRiwayatSekarang   : body.keluhanRiwayatSekarang   ?? undefined,
        riwayatPenyakitTerdahulu : body.riwayatPenyakitTerdahulu ?? undefined,
        riwayatSosialKebiasaan   : body.riwayatSosialKebiasaan   ?? undefined,
        riwayatPengobatan        : body.riwayatPengobatan        ?? undefined,
        pemeriksaanFisik         : body.pemeriksaanFisik         ?? undefined,
        pemeriksaanTambahan: (body.pemeriksaanTambahan ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
      include: INCLUDE_FULL,
    });

    await logAudit({
      userId    : actor.userId,
      action    : "UPDATE",
      resource  : "Diagnosis",
      resourceId: diagnosisId,
      meta      : { before: existing, after: body },
      req,
    });

    return withDokterUser(diagnosis);
  }

  /** DELETE /diagnoses/:diagnosisId — SUPERADMIN only */
  async remove(diagnosisId: string, actor: RequestUser, req: Request) {
    const existing = await prisma.diagnosis.findUnique({ where: { diagnosisId } });
    if (!existing) throw new AppError("Diagnosis tidak ditemukan", 404);

    await prisma.diagnosis.delete({ where: { diagnosisId } });

    await logAudit({
      userId    : actor.userId,
      action    : "DELETE",
      resource  : "Diagnosis",
      resourceId: diagnosisId,
      meta      : { diagnosisCode: existing.diagnosisCode },
      req,
    });

    return { deleted: true, diagnosisId };
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CreateDiagnosisBody {
  doktorPemeriksa           : string;
  diagnosa                  : string;
  kategoriDiagnosa?         : string;
  icdPrimer?                : string;
  icdSekunder?              : string;
  icdTersier?               : string;
  keluhanRiwayatSekarang?   : string;
  riwayatPenyakitTerdahulu? : string;
  riwayatSosialKebiasaan?   : string;
  riwayatPengobatan?        : string;
  pemeriksaanFisik?         : string;
  pemeriksaanTambahan?      : Record<string, unknown>;
}