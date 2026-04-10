import { Response, NextFunction }         from 'express';
import { AppError }                       from '../../utils/AppError';
import { sendSuccess }                    from '../../utils/response';
import { type AuthRequest }               from '../../middlewares/authenticate';

// Nama service harus sama persis dengan export di sessions.service.ts
import {
  listSessions,                 // ← bukan listSessionsService
  getSessionDetail,             // ← bukan getSessionByIdService
  updateSessionStatusService,   // ← Sprint 7, tambahan baru
} from './sessions.service';

// ─── GET /treatment-sessions ─────────────────────────────────────────────────
// Nama controller tetap 'getSessions' agar sessions.routes.ts tidak perlu diubah

export const getSessions = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const data = await listSessions(req.user!);
    sendSuccess(res, data, 'Daftar sesi berhasil diambil');
  } catch (err) { next(err); }
};

// ─── GET /treatment-sessions/:sessionId ──────────────────────────────────────

export const getSession = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const data = await getSessionDetail(req.params.sessionId, req.user!);
    sendSuccess(res, data, 'Detail sesi berhasil diambil');
  } catch (err) { next(err); }
};

// ─── PATCH /treatment-sessions/:sessionId/status — Sprint 7 ─────────────────

export const updateSessionStatus = async (
  req: AuthRequest, res: Response, next: NextFunction,
) => {
  try {
    const { status } = req.body as { status?: string };

    if (!status) {
      throw new AppError('Field status wajib diisi.', 400);
    }

    const VALID = ['PLANNED', 'INPROGRESS', 'COMPLETED', 'POSTPONED'] as const;
    if (!VALID.includes(status as typeof VALID[number])) {
      throw new AppError(`Status tidak valid. Pilihan: ${VALID.join(', ')}`, 400);
    }

    const result = await updateSessionStatusService(
      req.params.sessionId,
      status,
      req.user!,
    );
    sendSuccess(res, result, `Status sesi diperbarui ke ${status}`);
  } catch (err) { next(err); }
};