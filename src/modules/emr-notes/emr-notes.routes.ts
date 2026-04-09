import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import { createEmrNoteValidator } from "./emr-notes.validator";
import { listEmrNotes, createEmrNote } from "./emr-notes.controller";

const router = Router({ mergeParams: true });

const ALL_ROLES = ["NURSE", "DOCTOR", "ADMIN_LAYANAN", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"] as const;

router.get("/", authorize(...ALL_ROLES), listEmrNotes);
router.post("/", authorize("NURSE", "DOCTOR", "ADMIN_LAYANAN"), createEmrNoteValidator, createEmrNote);

export default router;