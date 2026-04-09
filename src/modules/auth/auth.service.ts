import bcrypt          from "bcryptjs";
import jwt             from "jsonwebtoken";
import { prisma }      from "@/config/prisma";
import { env }         from "@/config/env";
import type { LoginDto } from "./auth.validator";
import { AppError } from '../../utils/AppError';
interface TokenPair {
  accessToken:  string;
  refreshToken: string;
}

const signTokens = (userId: string): TokenPair => ({
  accessToken:  jwt.sign({ userId }, env.JWT_ACCESS_SECRET,  { expiresIn: env.JWT_ACCESS_EXPIRY  as any }),
  refreshToken: jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY as any }),
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginService = async (dto: LoginDto) => {
  const user = await prisma.user.findUnique({
    where:   { email: dto.email },
    include: {
      role:    true,
      profile: { select: { fullName: true, avatarUrl: true } },
    },
  });

  if (!user || !user.isActive)
    throw new AppError("Email atau password salah", 401);

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid)
    throw new AppError("Email atau password salah", 401);

  const tokens = signTokens(user.userId);

  return {
    tokens,
    user: {
      userId:    user.userId,
      email:     user.email,
      staffCode: user.staffCode,
      role:      user.role.name,
      branchId:  user.branchId,
      fullName:  user.profile?.fullName  ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
    },
  };
};

// ─── Refresh ──────────────────────────────────────────────────────────────────

export const refreshService = async (refreshToken: string) => {
  let payload: { userId: string };
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new AppError("Refresh token tidak valid atau expired", 401); // ← fix
  }
  const user = await prisma.user.findUnique({ where: { userId: payload.userId, isActive: true } });
  if (!user) throw new AppError("User tidak ditemukan", 401); // ← fix
  return signTokens(user.userId);
};
// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutService = async (_userId: string) => ({
  message: "Logout berhasil",
});

// ─── Me (NEW) ─────────────────────────────────────────────────────────────────

export const meService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where:   { userId, isActive: true },
    include: {
      role:    true,
      profile: { select: { fullName: true, avatarUrl: true } },
    },
  });

  if (!user) throw new AppError("User tidak ditemukan", 401);

  return {
    userId:    user.userId,
    email:     user.email,
    staffCode: user.staffCode,
    role:      user.role.name,
    branchId:  user.branchId,
    fullName:  user.profile?.fullName  ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
};