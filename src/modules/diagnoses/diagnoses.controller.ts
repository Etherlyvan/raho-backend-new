import type { Request, Response, NextFunction } from "express";
import { z }                                    from "zod";
import { DiagnosisService }                     from "./diagnoses.service";
import { sendSuccess, sendError }               from "../../utils/response";
import type { AuthRequest }                     from "../../middlewares/authenticate";

const svc = new DiagnosisService();

// ── Zod Schemas ────────────────────────────────────────────────────────────────
const createSchema = z.object({
  doktorPemeriksa           : z.string().min(1, "Wajib diisi"),
  diagnosa                  : z.string().min(1, "Diagnosa wajib diisi").max(1000),
  kategoriDiagnosa          : z.string().max(200).optional(),
  icdPrimer                 : z.string().max(20).optional(),
  icdSekunder               : z.string().max(20).optional(),
  icdTersier                : z.string().max(20).optional(),
  keluhanRiwayatSekarang    : z.string().max(5000).optional(),
  riwayatPenyakitTerdahulu  : z.string().max(5000).optional(),
  riwayatSosialKebiasaan    : z.string().max(5000).optional(),
  riwayatPengobatan         : z.string().max(5000).optional(),
  pemeriksaanFisik          : z.string().max(5000).optional(),
  pemeriksaanTambahan       : z.record(z.unknown()).optional(),
});

const updateSchema = createSchema.partial();

// ── Controllers ────────────────────────────────────────────────────────────────
export async function listDiagnoses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.listByEncounter(req.params.encounterId, req.user!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

export async function createDiagnosis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body);
    const data = await svc.create(req.params.encounterId, body, req.user!, req);
    sendSuccess(res, data, "Diagnosis berhasil disimpan", 201);
  } catch (err) { next(err); }
}

export async function getDiagnosis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getById(req.params.diagnosisId, req.user!);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

export async function updateDiagnosis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = updateSchema.parse(req.body);
    const data = await svc.update(req.params.diagnosisId, body, req.user!, req);
    sendSuccess(res, data, "Diagnosis berhasil diperbarui");
  } catch (err) { next(err); }
}

export async function deleteDiagnosis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.remove(req.params.diagnosisId, req.user!, req);
    sendSuccess(res, data, "Diagnosis berhasil dihapus");
  } catch (err) { next(err); }
}