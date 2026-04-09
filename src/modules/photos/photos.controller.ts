import { Request, Response, NextFunction } from "express";
import { PhotoService } from "./photos.service";
import { AppError } from "../../utils/AppError";
import type { AuthRequest } from "../../middlewares/authenticate";

const service = new PhotoService();

// GET /treatment-sessions/:sessionId/photos
export async function listPhotos(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { sessionId } = req.params;
    const actor = (req as AuthRequest).user!;
    const photos = await service.listBySession(sessionId, actor);
    res.json({ success: true, message: "OK", data: photos });
  } catch (err) {
    next(err);
  }
}

// POST /treatment-sessions/:sessionId/photos
export async function uploadPhoto(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { sessionId } = req.params;
    const actor = (req as AuthRequest).user!;
    const file = req.file;

    if (!file) throw new AppError("File foto wajib diupload", 400);

    const caption = req.body.caption as string | undefined;
    const photo = await service.upload(sessionId, actor, file, caption);

    res.status(201).json({
      success: true,
      message: "Foto berhasil diupload",
      data: photo,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /treatment-sessions/:sessionId/photos/:photoId
export async function deletePhoto(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { sessionId, photoId } = req.params;
    const actor = (req as AuthRequest).user!;
    const result = await service.remove(sessionId, photoId, actor);
    res.json({ success: true, message: "Foto berhasil dihapus", data: result });
  } catch (err) {
    next(err);
  }
}