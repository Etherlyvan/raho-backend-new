import { body } from "express-validator";

export const uploadPhotoValidator = [
  body("caption")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Caption maksimal 500 karakter"),
  body("takenAt")
    .optional()
    .isISO8601()
    .withMessage("Format tanggal tidak valid (ISO 8601)"),
];