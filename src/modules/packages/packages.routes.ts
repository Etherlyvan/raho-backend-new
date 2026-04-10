import { Router }   from 'express';
// ✅ FIX: path yang benar + dua file terpisah
import { authenticate } from '../../middlewares/authenticate';
import { authorize }    from '../../middlewares/authorize';
import { RoleName }     from '../../generated/prisma';
import * as ctrl        from './packages.controller';

const router = Router();

const AL_UP = [RoleName.ADMIN_LAYANAN, RoleName.ADMIN_CABANG, RoleName.ADMIN_MANAGER, RoleName.SUPER_ADMIN];
const AC_UP = [RoleName.ADMIN_CABANG,  RoleName.ADMIN_MANAGER, RoleName.SUPER_ADMIN];

router.get  ('/package-pricings',                         authenticate, authorize(...AL_UP), ctrl.listPricings);
router.get  ('/members/:id/packages',                     authenticate, authorize(...AL_UP), ctrl.listPackages);
router.post ('/members/:id/packages',                     authenticate, authorize(...AL_UP), ctrl.assignPackage);
router.patch('/members/:id/packages/:packageId/verify',   authenticate, authorize(...AC_UP), ctrl.verifyPackage);

export default router;