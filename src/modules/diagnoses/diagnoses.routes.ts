import { Router }          from "express";
import { authenticate }    from "../../middlewares/authenticate";
import { authorize }       from "../../middlewares/authorize";
import {
  listDiagnoses,
  createDiagnosis,
  getDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
} from "./diagnoses.controller";

const router = Router({ mergeParams: true }); // ← mergeParams untuk :encounterId

// Semua route butuh autentikasi
router.use(authenticate);

// ── Nested: /encounters/:encounterId/diagnoses ─────────────────────────────────
router.get(
  "/",
  authorize("NURSE", "DOCTOR", "ADMIN_LAYANAN", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"),
  listDiagnoses,
);

router.post(
  "/",
  authorize("DOCTOR", "ADMIN_LAYANAN", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"),
  createDiagnosis,
);

// ── Standalone: /diagnoses/:diagnosisId ───────────────────────────────────────
export const diagnosisStandaloneRouter = Router();
diagnosisStandaloneRouter.use(authenticate);

diagnosisStandaloneRouter.get(
  "/:diagnosisId",
  authorize("NURSE", "DOCTOR", "ADMIN_LAYANAN", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"),
  getDiagnosis,
);

diagnosisStandaloneRouter.patch(
  "/:diagnosisId",
  authorize("SUPER_ADMIN"),
  updateDiagnosis,
);

diagnosisStandaloneRouter.delete(
  "/:diagnosisId",
  authorize("SUPER_ADMIN"),
  deleteDiagnosis,
);

export { router as diagnosisNestedRouter };