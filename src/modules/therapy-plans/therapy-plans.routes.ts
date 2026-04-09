import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import type { RoleName } from '../../generated/prisma';
import * as ctrl from './therapy-plans.controller';

// ─── Role constants ───────────────────────────────────────────────────────────

const PLAN_ROLES = [
  'NURSE', 'DOCTOR', 'ADMIN_LAYANAN',
  'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN',
] as const satisfies RoleName[];

const SUPERADMIN_ONLY = ['SUPER_ADMIN'] as const satisfies RoleName[];

// ─── /treatment-sessions/:sessionId/therapy-plan ─────────────────────────────

export const sessionTherapyPlanRouter = Router({ mergeParams: true });

sessionTherapyPlanRouter.use(authenticate);

sessionTherapyPlanRouter
  .route('/')
  .get(   authorize(...PLAN_ROLES),      ctrl.getTherapyPlan)
  .post(  authorize(...PLAN_ROLES),      ctrl.createTherapyPlan)
  .patch( authorize(...SUPERADMIN_ONLY), ctrl.updateTherapyPlan)
  .delete(authorize(...SUPERADMIN_ONLY), ctrl.deleteTherapyPlan);

// ─── /members/:memberId/therapy-history ──────────────────────────────────────

export const memberTherapyHistoryRouter = Router({ mergeParams: true });

memberTherapyHistoryRouter.use(authenticate);

memberTherapyHistoryRouter.get(
  '/',
  authorize(...PLAN_ROLES),
  ctrl.getTherapyHistory,
);