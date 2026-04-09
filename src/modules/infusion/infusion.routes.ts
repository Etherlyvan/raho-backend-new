import { Router }         from "express";
import { getInfusion, upsertInfusion } from "./infusion.controller";

// mergeParams: true → baca :sessionId dari parent router
const router = Router({ mergeParams: true });

router.get("/",  getInfusion);
router.post("/", upsertInfusion);

export default router;