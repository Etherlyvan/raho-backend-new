import { Router, Response, NextFunction } from 'express';
import { authenticate }   from '../../middlewares/authenticate';
import { authorize }      from '../../middlewares/authorize';
import { prisma }         from '../../config/prisma';
import { sendSuccess }    from '../../utils/response';
import { type AuthRequest } from '../../middlewares/authenticate';

const router = Router();

/**
 * GET /users/doctors
 * Kembalikan daftar user berole DOCTOR di cabang aktor.
 * Global role (SUPERADMIN, ADMINMANAGER) melihat semua cabang.
 */
router.get(
  '/doctors',
  authenticate,
  authorize('NURSE', 'DOCTOR', 'ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const actor = req.user!;
      const GLOBAL = ['SUPERADMIN', 'ADMINMANAGER'] as const;
      const branchFilter = (GLOBAL as readonly string[]).includes(actor.roleName)
        ? {}
        : { branchId: actor.branchId! };

      const doctors = await prisma.user.findMany({
        where: {
          ...branchFilter,
          role:     { name: 'DOCTOR' },
          isActive: true,
        },
        select: {
          userId:  true,
          profile: { select: { fullName: true } },
        },
        orderBy: { profile: { fullName: 'asc' } },
      });

      sendSuccess(
        res,
        doctors.map(d => ({ userId: d.userId, fullName: d.profile?.fullName ?? null })),
      );
    } catch (err) {
      next(err);
    }
  },
);

export default router;