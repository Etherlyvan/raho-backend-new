import { Request, Response, NextFunction } from 'express';
import * as svc     from './packages.service';
import { AppError } from '../../utils/AppError';

const getUser = (req: Request) => {
  if (!req.user)         throw new AppError('Unauthorized', 401);
  if (!req.user.branchId) throw new AppError('User tidak terikat ke cabang', 403);
  return req.user;
};

export const listPricings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = getUser(req);
    const data = await svc.listPackagePricings(user.branchId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const listPackages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ FIX: pass req.user! langsung (bukan .role)
    const data = await svc.listMemberPackages(req.params.id, getUser(req));
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const assignPackage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ FIX: pass req.user! langsung
    const data = await svc.assignPackage(req.params.id, getUser(req), req.body);
    res.status(201).json({ success: true, message: 'Paket berhasil di-assign', data });
  } catch (err) { next(err); }
};

export const verifyPackage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ✅ FIX: pass req.user! langsung
    const data = await svc.verifyPackage(req.params.id, req.params.packageId, getUser(req));
    res.json({ success: true, message: 'Pembayaran terverifikasi', data });
  } catch (err) { next(err); }
};