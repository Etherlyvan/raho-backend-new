import { Router }     from "express";
import { authenticate }              from "../../middlewares/authenticate";
import { authorize }                 from "../../middlewares/authorize";
import { getSessions, getSession }   from "./sessions.controller"; // ← tambah getSessions

import vitalSignsRouter from "../vital-signs/vital-signs.routes";
import infusionRouter   from "../infusion/infusion.routes";
import photosRouter     from "../photos/photos.routes";
import materialsRouter  from "../materials/materials.routes";
import emrNotesRouter   from "../emr-notes/emr-notes.routes";

const router = Router();
router.use(authenticate);

const ALL_ROLES = ["NURSE","DOCTOR","ADMIN_LAYANAN","ADMIN_CABANG","ADMIN_MANAGER","SUPER_ADMIN"] as const;

// ─── GET /treatment-sessions  ← BARU
router.get("/", authorize(...ALL_ROLES), getSessions);

// ─── GET /treatment-sessions/:id
router.get("/:sessionId", authorize(...ALL_ROLES), getSession);

// Sub-routes
router.use("/:sessionId/vital-signs", vitalSignsRouter);
router.use("/:sessionId/infusion",    infusionRouter);
router.use("/:sessionId/photos",      photosRouter);
router.use("/:sessionId/materials",   materialsRouter);
router.use("/:sessionId/emr-notes",   emrNotesRouter);

export default router;