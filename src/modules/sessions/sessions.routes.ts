import { Router }         from "express";
import { authenticate }   from "../../middlewares/authenticate";
import { authorize }      from "../../middlewares/authorize";
import { getSession }     from "./sessions.controller";
import vitalSignsRouter   from "../vital-signs/vital-signs.routes";
import infusionRouter     from "../infusion/infusion.routes";      // ← ADD

const router = Router();

router.use(authenticate, authorize("NURSE"));

// GET /treatment-sessions/:id
router.get("/:id", getSession);

// /treatment-sessions/:sessionId/vital-signs
router.use("/:sessionId/vital-signs", vitalSignsRouter);

// /treatment-sessions/:sessionId/infusion  ← ADD
router.use("/:sessionId/infusion", infusionRouter);

export default router;