import { Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { AppError } from "../../utils/AppError";
import { sendSuccess } from "../../utils/response";
import { listMaterialsService, createMaterialService } from "./materials.service";
import type { AuthRequest } from "../../middlewares/authenticate";

export const listMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await listMaterialsService(req.params.sessionId, req.user!), "Daftar pemakaian bahan");
  } catch (e) { next(e); }
};

export const createMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg as string, 422);

    const material = await createMaterialService(req.params.sessionId, req.user!, {
      inventoryItemId: req.body.inventoryItemId,
      quantity: Number(req.body.quantity),
      unit: req.body.unit,
    });
    sendSuccess(res, material, "Pemakaian bahan berhasil dicatat", 201);
  } catch (e) { next(e); }
};