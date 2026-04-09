// src/modules/dashboard/dashboard.routes.ts
import { Router }            from "express";
import { authenticate }      from "../../middlewares/authenticate";
import { authorize }         from "../../middlewares/authorize";
import { getNurseDashboard } from "./nurse-dashboard.controller";

const router = Router();

router.use(authenticate);

router.get(
  "/nurse",
  authorize("NURSE", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"),  // ✅ tanpa underscore
  getNurseDashboard,
);

export default router;
export { router as dashboardRouter };