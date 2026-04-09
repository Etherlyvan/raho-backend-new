// ← Ganti @prisma/client dengan path relatif ke generated
import { RoleName } from "../generated/prisma";

export interface RequestUser {
  userId:   string;
  roleId:   string;
  roleName: RoleName;
  branchId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}