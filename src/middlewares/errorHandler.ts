import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name       = "AppError";
    // ← FIX: wajib ada agar instanceof bekerja dengan TypeScript compiled output
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ← FIX: cek property statusCode, bukan instanceof (lebih robust)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Fallback untuk non-AppError (Prisma error, dll)
  if (err instanceof Error) {
    // Jangan expose internal error ke client
    if (process.env.NODE_ENV !== "production") {
      console.error("[ERROR]", err);
    }
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }

  res.status(500).json({ error: "Unknown error" });
};