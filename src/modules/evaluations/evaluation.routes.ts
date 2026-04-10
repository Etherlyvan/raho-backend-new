import { Router }       from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize }    from '../../middlewares/authorize';
import { getEvaluation,
         upsertEvaluation } from './evaluation.controller';

const router = Router({ mergeParams: true }); // inherit :sessionId dari parent
router.use(authenticate);

// Semua role klinik boleh GET
router.get(
  '/',
  authorize('NURSE', 'DOCTOR', 'ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN'),
  getEvaluation,
);

// Hanya DOCTOR & SUPERADMIN boleh upsert
router.post(
  '/',
  authorize('DOCTOR', 'SUPER_ADMIN'),
  upsertEvaluation,
);

export default router;