import { Request, Response, NextFunction } from 'express';
import type { RoleName } from '../../generated/prisma';
import * as service from './therapy-plans.service';

// ─── Helper: baca actor dari req.user ─────────────────────────────────────────

function actor(req: Request) {
  return {
    userId:   req.user!.userId,
    roleName: req.user!.roleName as RoleName,
    branchId: req.user!.branchId ?? null,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function getTherapyPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await service.getTherapyPlan(req.params.sessionId, actor(req));
    res.json({ success: true, data: plan });
  } catch (e) { next(e); }
}

export async function createTherapyPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await service.createTherapyPlan(req.params.sessionId, req.body, actor(req));
    res.status(201).json({ success: true, message: 'Terapi plan berhasil dibuat.', data: plan });
  } catch (e) { next(e); }
}

export async function updateTherapyPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await service.updateTherapyPlan(req.params.sessionId, req.body, actor(req));
    res.json({ success: true, message: 'Terapi plan berhasil diperbarui.', data: plan });
  } catch (e) { next(e); }
}

export async function deleteTherapyPlan(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteTherapyPlan(req.params.sessionId, actor(req));
    res.json({ success: true, message: 'Terapi plan berhasil dihapus.' });
  } catch (e) { next(e); }
}

export async function getTherapyHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));

    const result = await service.getTherapyHistory(
      req.params.memberId,
      actor(req),
      { page, limit },
    );

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (e) { next(e); }
}