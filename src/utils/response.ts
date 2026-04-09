import { Response } from "express";

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
  meta?: Meta
): Response => {
  const body: Record<string, unknown> = { success: true, message, data };
  if (meta !== undefined) body["meta"] = meta;
  return res.status(statusCode).json(body);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown
): Response => {
  const body: Record<string, unknown> = { success: false, message };
  if (errors !== undefined) body["errors"] = errors;
  return res.status(statusCode).json(body);
};

/** Helper untuk return body JSON langsung (dipakai dengan res.json / res.status().json) */
export const ok = <T>(message: string, data: T) => ({
  success: true,
  message,
  data,
});