import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import { generatePhotoFileName } from "./uniqueCode";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "sessions", req.params.sessionId ?? "unknown");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, generatePhotoFileName(req.params.sessionId ?? "unknown", ext));
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  ALLOWED_MIME.includes(file.mimetype as (typeof ALLOWED_MIME)[number])
    ? cb(null, true)
    : cb(new Error("Hanya file JPG, PNG, dan WebP yang diizinkan"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES },
}).single("photo");

/** Wrapper multer agar error diteruskan ke global errorHandler */
export const photoUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload(req, res, (err) => {
    if (!err) return next();
    const msg =
      err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? "Ukuran file maksimal 5MB"
        : err.message;
    next(new AppError(msg, 400));
  });
};