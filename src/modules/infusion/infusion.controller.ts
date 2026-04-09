import { Response, NextFunction } from "express";
import { ZodError }               from "zod";
import { upsertInfusionSchema }   from "./infusion.validator";
import { getInfusionService, upsertInfusionService } from "./infusion.service";
import { sendSuccess }            from "../../utils/response";
import { AppError }               from "../../utils/AppError";
import type { AuthRequest }       from "../../middlewares/authenticate";

export const getInfusion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await getInfusionService(req.params.sessionId, req.user!);
    sendSuccess(res, data, "Data infus berhasil diambil");
  } catch (err) {
    next(err);
  }
};

export const upsertInfusion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto  = upsertInfusionSchema.parse(req.body);
    const data = await upsertInfusionService(
      req.params.sessionId,
      dto,
      req.user!,
      req.ip
    );
    sendSuccess(res, data, "Data infus berhasil disimpan", 201);
  } catch (err) {
    if (err instanceof ZodError) {
      next(new AppError(err.errors[0].message, 422));
      return;
    }
    next(err);
  }
};