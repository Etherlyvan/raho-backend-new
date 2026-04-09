import { Router }    from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize }    from "../../middlewares/authorize";
import { listMembers, getMemberById } from "./members.controller";
import { listMemberSessions } from "./members.controller";
const router = Router();
router.use(authenticate);

const ALL_ROLES = ["NURSE","DOCTOR","ADMIN_LAYANAN","ADMIN_CABANG","ADMIN_MANAGER","SUPER_ADMIN"] as const;

router.get("/",           authorize(...ALL_ROLES), listMembers);
router.get("/:memberId",  authorize(...ALL_ROLES), getMemberById);
router.get("/:memberId/sessions", authorize(...ALL_ROLES), listMemberSessions);
export default router;