import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { sendError } from "../utils/response";
import { RoleName } from "../generated/prisma";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    roleId: string;
    roleName: RoleName;
    branchId: string | null;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    sendError(res, "Unauthorized: No token provided", 401);
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: { userId: payload.userId },
      select: {
        userId: true,
        roleId: true,
        branchId: true,
        isActive: true,
        role: { select: { name: true } },
      },
    });

    if (!user || !user.isActive) {
      sendError(res, "Unauthorized: User not found or inactive", 401);
      return;
    }

    req.user = {
      userId: user.userId,
      roleId: user.roleId,
      roleName: user.role.name,
      branchId: user.branchId,
    };

    next();
  } catch {
    sendError(res, "Unauthorized: Invalid or expired token", 401);
  }
};