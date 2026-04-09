import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import { createMaterialValidator } from "./materials.validator";
import { listMaterials, createMaterial } from "./materials.controller";

const router = Router({ mergeParams: true });

const ALL_ROLES = ["NURSE", "DOCTOR", "ADMIN_LAYANAN", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"] as const;

router.get("/", authorize(...ALL_ROLES), listMaterials);
router.post("/", authorize("NURSE", "DOCTOR"), createMaterialValidator, createMaterial);

export default router;