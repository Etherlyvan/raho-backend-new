import { body } from "express-validator";

export const createMaterialValidator = [
  body("inventoryItemId")
    .notEmpty()
    .withMessage("inventoryItemId wajib diisi"),
  body("quantity")
    .isFloat({ gt: 0 })
    .withMessage("Quantity harus lebih dari 0"),
  body("unit")
    .notEmpty()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Satuan wajib diisi (maks 50 karakter)"),
];