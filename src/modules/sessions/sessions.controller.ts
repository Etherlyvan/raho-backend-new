import { Request, Response, NextFunction } from "express";
import { getSessionDetail, listSessions } from "./sessions.service"; // ← tambah listSessions
import { sendSuccess }                    from "../../utils/response";
import type { AuthRequest }               from "../../middlewares/authenticate";

// ─── GET /treatment-sessions ─────────────────────────────────────────────────
export const getSessions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessions = await listSessions(req.user!);
    sendSuccess(res, sessions, "Daftar sesi berhasil diambil");
  } catch (err) {
    next(err);
  }
};

// ─── GET /treatment-sessions/:id ─────────────────────────────────────────────

export const getSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await getSessionDetail(req.params.sessionId, req.user!); // ← FIX
    sendSuccess(res, session, "Detail sesi berhasil diambil");
  } catch (err) {
    next(err);
  }
};