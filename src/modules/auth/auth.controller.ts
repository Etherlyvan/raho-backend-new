import { Request, Response, NextFunction } from "express";
import { loginSchema, refreshSchema }      from "./auth.validator";
import { loginService, refreshService, logoutService, meService } from "./auth.service";
import { sendSuccess }                     from "@/utils/response";
import type { AuthRequest }                from "@/middlewares/authenticate";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dto    = loginSchema.parse(req.body);
    const result = await loginService(dto);
    sendSuccess(res, result, "Login berhasil");
  } catch (err) {
    next(err);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens           = await refreshService(refreshToken);
    sendSuccess(res, tokens, "Token diperbarui");
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await logoutService(req.user!.userId);
    sendSuccess(res, result, "Logout berhasil");
  } catch (err) {
    next(err);
  }
};

// ─── Me (NEW) ─────────────────────────────────────────────────────────────────

export const me = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await meService(req.user!.userId);
    sendSuccess(res, result, "Data user berhasil diambil");
  } catch (err) {
    next(err);
  }
};