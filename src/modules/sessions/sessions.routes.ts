import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { getSession } from "./sessions.controller";

// Sub-routes Sprint 2 & 3
import vitalSignsRouter from "../vital-signs/vital-signs.routes";
import infusionRouter from "../infusion/infusion.routes";

// ─── Sub-routes Sprint 4 ──────────────────────────────────────────────────────
import photosRouter from "../photos/photos.routes";
import materialsRouter from "../materials/materials.routes";
import emrNotesRouter from "../emr-notes/emr-notes.routes";
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

// Authenticate semua route sesi
router.use(authenticate);

// GET /treatment-sessions/:sessionId
router.get("/:sessionId", authorize("NURSE", "DOCTOR", "ADMIN_LAYANAN", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"), getSession);

// Sub-routes Sprint 2 & 3
router.use("/:sessionId/vital-signs", vitalSignsRouter);
router.use("/:sessionId/infusion", infusionRouter);

// Sub-routes Sprint 4
router.use("/:sessionId/photos", photosRouter);
router.use("/:sessionId/materials", materialsRouter);
router.use("/:sessionId/emr-notes", emrNotesRouter);

export default router;