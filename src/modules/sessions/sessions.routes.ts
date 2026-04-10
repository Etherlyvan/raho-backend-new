import { Router }          from 'express';
import { authenticate }    from '../../middlewares/authenticate';
import { authorize }       from '../../middlewares/authorize';

// Nama import harus cocok dengan export di sessions.controller.ts
import {
  getSessions,
  getSession,
  updateSessionStatus,     // ← Sprint 7
} from './sessions.controller';

import evaluationRouter    from '../evaluations/evaluation.routes'; // Sprint 7
import vitalSignsRouter    from '../vital-signs/vital-signs.routes';
import infusionRouter      from '../infusion/infusion.routes';
import photosRouter        from '../photos/photos.routes';
import materialsRouter     from '../materials/materials.routes';
import emrNotesRouter      from '../emr-notes/emr-notes.routes';

const router = Router();
router.use(authenticate);

const ALL_ROLES = [
  'NURSE', 'DOCTOR', 'ADMIN_LAYANAN', 'ADMIN_CABANG', 'ADMIN_MANAGER', 'SUPER_ADMIN',
] as const;

// ─── Top-level routes ─────────────────────────────────────────────────────────

router.get('/',           authorize(...ALL_ROLES), getSessions);
router.get('/:sessionId', authorize(...ALL_ROLES), getSession);

// ─── Sprint 7: status transition ─────────────────────────────────────────────

router.patch(
  '/:sessionId/status',
  authorize(...ALL_ROLES),
  updateSessionStatus,
);

// ─── Sub-resource routes ──────────────────────────────────────────────────────

router.use('/:sessionId/vital-signs',  vitalSignsRouter);
router.use('/:sessionId/infusion',     infusionRouter);
router.use('/:sessionId/photos',       photosRouter);
router.use('/:sessionId/materials',    materialsRouter);
router.use('/:sessionId/emr-notes',    emrNotesRouter);
router.use('/:sessionId/evaluation',   evaluationRouter); // Sprint 7

export default router;