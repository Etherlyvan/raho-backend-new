import { Request, Response, NextFunction } from "express";
import { getSessionDetail }                from "@/modules/sessions/sessions.service";
import { sendSuccess }                     from "@/utils/response"; // ← pakai sendSuccess

export const getSession = async (
  req:  Request,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await getSessionDetail(req.params.id, req.user!);
    sendSuccess(res, session, "Detail sesi berhasil diambil");
  } catch (err) {
    next(err);
  }
};