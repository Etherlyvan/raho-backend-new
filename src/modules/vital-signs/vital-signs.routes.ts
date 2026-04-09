import { Router } from "express";
import {
  list,
  upsert,
  remove,
  validateUpsert,
} from "@/modules/vital-signs/vital-signs.controller";

// mergeParams: true → agar :sessionId dari parent router terbaca
const router = Router({ mergeParams: true });

router.get(    "/",              list);
router.post(   "/", validateUpsert, upsert);
router.delete( "/:vitalSignId", remove);

export default router;