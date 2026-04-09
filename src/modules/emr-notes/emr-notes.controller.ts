import { Request, Response, NextFunction } from "express";
import { EmrNoteService } from "./emr-notes.service";
import type { AuthRequest } from "../../middlewares/authenticate";

const service = new EmrNoteService();

// Named export sesuai kontrak di emr-notes.routes.ts
export async function listEmrNotes(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { sessionId } = req.params;
    const notes = await service.listBySession(sessionId);
    res.json({ success: true, message: "OK", data: notes });
  } catch (err) {
    next(err);
  }
}

export async function createEmrNote(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { sessionId } = req.params;
    const actor = (req as AuthRequest).user!;
    const note = await service.create(
      sessionId,
      actor.userId,
      actor.roleName,
      req.body
    );
    res
      .status(201)
      .json({ success: true, message: "EMR note berhasil dibuat", data: note });
  } catch (err) {
    next(err);
  }
}