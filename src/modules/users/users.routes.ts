// src/modules/users/users.routes.ts
import { Router }                      from "express";
import type { Response, NextFunction } from "express";
import { authenticate }                from "../../middlewares/authenticate";
import { authorize }                   from "../../middlewares/authorize";
import type { AuthRequest }            from "../../middlewares/authenticate";
import { prisma }                      from "../../config/prisma";
import { sendSuccess }                 from "../../utils/response";

const router = Router();

router.get(
  "/doctors",
  authenticate,
  authorize("DOCTOR", "ADMIN_LAYANAN", "ADMIN_CABANG", "ADMIN_MANAGER", "SUPER_ADMIN"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const actor  = req.user!;
      const GLOBAL = ["SUPERADMIN", "ADMINMANAGER"] as const;

      const branchFilter = GLOBAL.includes(actor.roleName as never)
        ? {}
        : { branchId: actor.branchId! };

      const doctors = await prisma.user.findMany({
        where: {
          ...branchFilter,
          role    : { name: "DOCTOR" },
          isActive: true,
        },
        select: {
          userId : true,
          profile: { select: { fullName: true } },
        },
        orderBy: { profile: { fullName: "asc" } },
      });

      sendSuccess(
        res,
        doctors.map((d) => ({
          userId  : d.userId,
          fullName: d.profile?.fullName ?? null,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

export default router;