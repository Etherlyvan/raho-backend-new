import { Request, Response, NextFunction }  from "express";
import { AppError }                         from "@/utils/AppError";
import { ZodError }                         from "zod";
import { PrismaClientKnownRequestError }    from "@/generated/prisma/runtime/library";

export const errorHandler = (
  err:   unknown,
  _req:  Request,
  res:   Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validasi gagal",
      errors:  err.errors.map((e) => ({
        field:   e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      res.status(404).json({ success: false, message: "Data tidak ditemukan" });
      return;
    }
    if (err.code === "P2002") {
      res.status(409).json({ success: false, message: "Data sudah ada" });
      return;
    }
  }

  console.error("[ERROR]", err);
  res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
};