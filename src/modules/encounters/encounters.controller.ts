import { Request, Response, NextFunction } from 'express';
import * as svc     from './encounters.service';
import { AppError } from '../../utils/AppError';

const getUser = (req: Request) => {
  if (!req.user)          throw new AppError('Unauthorized', 401);
  if (!req.user.branchId) throw new AppError('User tidak terikat ke cabang', 403);
  return req.user;
};

export const listEncounters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ FIX: pass req.user! langsung (bukan .role)
    const data = await svc.listEncounters(req.params.id, getUser(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const createEncounter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ FIX: pass req.user! langsung
    const data = await svc.createEncounter(req.params.id, getUser(req), req.body);
    res.status(201).json({ success: true, message: 'Encounter berhasil dibuat', data });
  } catch (err) { next(err); }
};

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ FIX: pass req.user! langsung
    const data = await svc.createSession(req.params.id, getUser(req), req.body);
    res.status(201).json({ success: true, message: 'Sesi berhasil dibuat', data });
  } catch (err) { next(err); }
};