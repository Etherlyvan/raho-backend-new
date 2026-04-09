import { prisma }            from "@/config/prisma";       // ← named import
import { AppError }          from "@/utils/AppError";
import { recordAuditLog }    from "@/middlewares/auditLog";
import { checkSessionAccess } from "@/modules/sessions/sessions.service";
import { VitalSignType, VitalSignTiming } from "@/generated/prisma"; // ← bukan @prisma/client
import type { RequestUser }   from "@/types/express";

export interface UpsertVitalSignDto {
  pencatatan: VitalSignType;
  waktuCatat: VitalSignTiming;
  hasil:      number;
}

export const listVitalSigns = async (
  sessionId: string,
  user:      RequestUser
) => {
  await checkSessionAccess(sessionId, user);
  return prisma.sessionVitalSign.findMany({
    where:   { treatmentSessionId: sessionId },
    orderBy: [{ pencatatan: "asc" }, { waktuCatat: "asc" }],
  });
};

export const upsertVitalSign = async (
  sessionId:  string,
  dto:        UpsertVitalSignDto,
  user:       RequestUser,
  ipAddress?: string
) => {
  await checkSessionAccess(sessionId, user);

  const existing = await prisma.sessionVitalSign.findUnique({
    where: {
      treatmentSessionId_pencatatan_waktuCatat: {
        treatmentSessionId: sessionId,
        pencatatan:         dto.pencatatan,
        waktuCatat:         dto.waktuCatat,
      },
    },
  });

  const vitalSign = await prisma.sessionVitalSign.upsert({
    where: {
      treatmentSessionId_pencatatan_waktuCatat: {
        treatmentSessionId: sessionId,
        pencatatan:         dto.pencatatan,
        waktuCatat:         dto.waktuCatat,
      },
    },
    create: {
      treatmentSessionId: sessionId,
      pencatatan:         dto.pencatatan,
      waktuCatat:         dto.waktuCatat,
      hasil:              dto.hasil,
    },
    update: { hasil: dto.hasil },
  });

  await recordAuditLog({
    userId:     user.userId,
    action:     existing ? "UPDATE" : "CREATE",
    resource:   "SessionVitalSign",
    resourceId: vitalSign.sessionVitalSignId,
    meta: existing
      ? { before: { hasil: existing.hasil }, after: { hasil: dto.hasil } }
      : { pencatatan: dto.pencatatan, waktuCatat: dto.waktuCatat },
    ipAddress,
  });

  return vitalSign;
};

export const deleteVitalSign = async (
  sessionId:   string,
  vitalSignId: string,
  user:        RequestUser,
  ipAddress?:  string
) => {
  await checkSessionAccess(sessionId, user);

  const vitalSign = await prisma.sessionVitalSign.findUnique({
    where: { sessionVitalSignId: vitalSignId },
  });

  if (!vitalSign || vitalSign.treatmentSessionId !== sessionId)
    throw new AppError("Tanda vital tidak ditemukan", 404);

  await prisma.sessionVitalSign.delete({
    where: { sessionVitalSignId: vitalSignId },
  });

  await recordAuditLog({
    userId:     user.userId,
    action:     "DELETE",
    resource:   "SessionVitalSign",
    resourceId: vitalSignId,
    meta: {
      pencatatan: vitalSign.pencatatan,
      waktuCatat: vitalSign.waktuCatat,
      hasil:      vitalSign.hasil,
    },
    ipAddress,
  });
};