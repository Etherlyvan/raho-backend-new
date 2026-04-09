import { body } from "express-validator";
import { EMRNoteType } from "../../generated/prisma";

export const createEmrNoteValidator = [
  body("type")
    .isIn(Object.values(EMRNoteType))
    .withMessage(`type harus salah satu dari: ${Object.values(EMRNoteType).join(", ")}`),
  body("content")
    .notEmpty()
    .withMessage("content wajib diisi")
    .custom((v) => {
      if (typeof v !== "object" || v === null) throw new Error("content harus berupa JSON object");
      return true;
    }),
];