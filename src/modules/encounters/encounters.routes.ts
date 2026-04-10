import { Router }       from 'express';
// ✅ FIX: path yang benar
import { authenticate } from '../../middlewares/authenticate';
import { authorize }    from '../../middlewares/authorize';
import { RoleName }     from '../../generated/prisma';
import * as ctrl        from './encounters.controller';

const router = Router();

const AL_UP = [
  RoleName.ADMIN_LAYANAN, RoleName.ADMIN_CABANG,
  RoleName.ADMIN_MANAGER, RoleName.SUPER_ADMIN,
];

router.get ('/members/:id/encounters',  authenticate, authorize(...AL_UP), ctrl.listEncounters);
router.post('/members/:id/encounters',  authenticate, authorize(...AL_UP), ctrl.createEncounter);
router.post('/encounters/:id/sessions', authenticate, authorize(...AL_UP), ctrl.createSession);

export default router;