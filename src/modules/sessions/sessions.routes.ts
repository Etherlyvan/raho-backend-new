import { Router }       from "express";
import { authenticate } from "@/middlewares/authenticate";
import { authorize }    from "@/middlewares/authorize";
import { getSession }   from "@/modules/sessions/sessions.controller";
import vitalSignsRouter from "@/modules/vital-signs/vital-signs.routes";

const router = Router();

router.get("/:id",
  authenticate,
  authorize("NURSE"),
  getSession
);

router.use("/:sessionId/vital-signs",
  authenticate,
  authorize("NURSE"),
  vitalSignsRouter
);

export default router;