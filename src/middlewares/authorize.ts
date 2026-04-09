import { Request, Response, NextFunction } from "express";
import { sendError }                       from "../utils/response";
import { RoleName }                        from "../generated/prisma";

const ROLE_HIERARCHY: RoleName[] = [
  "SUPER_ADMIN",
  "ADMIN_MANAGER",
  "ADMIN_CABANG",
  "ADMIN_LAYANAN",
  "DOCTOR",
  "NURSE",
  "MEMBER",
];

export const authorize =
  (...allowedRoles: RoleName[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.roleName;

    if (!userRole) {
      sendError(res, "Forbidden: No role found", 403);
      return;
    }

    if (allowedRoles.length === 0) {
      next();
      return;
    }

    const userIdx  = ROLE_HIERARCHY.indexOf(userRole);
    const isAllowed = allowedRoles.some(
      (role) => ROLE_HIERARCHY.indexOf(role) >= userIdx
    );

    if (!isAllowed) {
      sendError(res, "Forbidden: Insufficient permissions", 403);
      return;
    }

    next();
  };