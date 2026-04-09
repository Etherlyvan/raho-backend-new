import { Request, Response, NextFunction }            from "express";
import { body, validationResult }                     from "express-validator";
import { VitalSignType, VitalSignTiming }             from "@/generated/prisma"; // ← bukan @prisma/client
import {
  listVitalSigns,
  upsertVitalSign,
  deleteVitalSign,
} from "@/modules/vital-signs/vital-signs.service";
import { sendSuccess } from "@/utils/response"; // ← pakai sendSuccess
import { AppError }    from "@/utils/AppError";

export const validateUpsert = [
  body("pencatatan")
    .isIn(Object.values(VitalSignType))
    .withMessage(
      `pencatatan harus salah satu dari: ${Object.values(VitalSignType).join(", ")}`
    ),
  body("waktuCatat")
    .isIn(Object.values(VitalSignTiming))
    .withMessage(
      `waktuCatat harus salah satu dari: ${Object.values(VitalSignTiming).join(", ")}`
    ),
  body("hasil")
    .isNumeric().withMessage("hasil harus berupa angka")
    .isFloat({ min: 0, max: 9999.99 }).withMessage("hasil harus antara 0 – 9999.99"),
];

export const list = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await listVitalSigns(req.params.sessionId, req.user!);
    sendSuccess(res, data, "Tanda vital berhasil diambil");
  } catch (err) {
    next(err);
  }
};

export const upsert = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      throw new AppError(errors.array()[0].msg as string, 422);

    const data = await upsertVitalSign(
      req.params.sessionId,
      req.body,
      req.user!,
      req.ip
    );
    sendSuccess(res, data, "Tanda vital berhasil disimpan", 201);
  } catch (err) {
    next(err);
  }
};

export const remove = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deleteVitalSign(
      req.params.sessionId,
      req.params.vitalSignId,
      req.user!,
      req.ip
    );
    sendSuccess(res, null, "Tanda vital berhasil dihapus");
  } catch (err) {
    next(err);
  }
};