import { Response, NextFunction }                  from 'express';
import {
  listMembersService,
  getMemberByIdService,
  listMemberSessionsService,
  getTherapyHistoryService,        // ← TAMBAH
} from './members.service';
import { sendSuccess }             from '../../utils/response';
import { type AuthRequest }        from '../../middlewares/authenticate';

export const listMembers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await listMembersService(req.user!), 'Daftar member berhasil diambil'); }
  catch (err) { next(err); }
};

export const getMemberById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await getMemberByIdService(req.params.memberId, req.user!), 'Detail member berhasil diambil'); }
  catch (err) { next(err); }
};

export const listMemberSessions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await listMemberSessionsService(req.params.memberId, req.user!), 'Sesi member berhasil diambil'); }
  catch (err) { next(err); }
};

// ─── Sprint 6 ─────────────────────────────────────────────────────────────────

export const getTherapyHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await getTherapyHistoryService(req.params.memberId, req.user!, page, limit);

    sendSuccess(res, result.data, 'Riwayat terapi berhasil diambil', 200, {
      page:       result.page,
      limit:      result.limit,
      total:      result.total,
      totalPages: Math.ceil(result.total / result.limit),
    });
  } catch (err) {
    next(err);
  }
};