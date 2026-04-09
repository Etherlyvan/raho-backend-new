import { prisma } from "../config/prisma";
import { RoleName } from "../generated/prisma";

/** Prefix per role untuk staffCode */
const ROLE_PREFIX: Record<RoleName, string> = {
  SUPER_ADMIN: "SA",
  ADMIN_MANAGER: "ADM",
  ADMIN_CABANG: "ADC",
  ADMIN_LAYANAN: "ADL",
  DOCTOR: "DOC",
  NURSE: "NRS",
  MEMBER: "MBR",
};

/** Generate random alphanumeric string uppercase */
const randStr = (length: number): string =>
  Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase()
    .padEnd(length, "X");

/** Format YYYYMMDD dari Date */
const dateStamp = (d = new Date()): string =>
  d.toISOString().slice(0, 10).replace(/-/g, "");

/** Format YYYYMM dari Date */
const monthStamp = (d = new Date()): string =>
  d.toISOString().slice(0, 7).replace(/-/g, "");

/**
 * Generate staffCode unik per role.
 * Format: {ROLE_PREFIX}-{YYYYMMDD}-{4RAND}
 * Contoh: DOC-20240401-A3F2, NRS-20240401-K9XZ
 *
 * Makna: Role + Tanggal bergabung + Random suffix untuk uniqueness
 */
export const generateStaffCode = async (role: RoleName): Promise<string> => {
  const prefix = ROLE_PREFIX[role];
  let code: string;
  let exists = true;

  do {
    code = `${prefix}-${dateStamp()}-${randStr(4)}`;
    const found = await prisma.user.findUnique({ where: { staffCode: code } });
    exists = !!found;
  } while (exists);

  return code;
};

/**
 * Generate memberNo unik.
 * Format: MBR-{BRANCH_CODE}-{YYYYMM}-{5SEQ}
 * Contoh: MBR-JKT01-202404-00023
 *
 * Makna: Identifikasi cabang registrasi + periode daftar + nomor urut
 */
export const generateMemberNo = async (branchCode: string): Promise<string> => {
  const prefix = `MBR-${branchCode}-${monthStamp()}`;

  const lastMember = await prisma.member.findFirst({
    where: { memberNo: { startsWith: prefix } },
    orderBy: { memberNo: "desc" },
  });

  let seq = 1;
  if (lastMember?.memberNo) {
    const parts = lastMember.memberNo.split("-");
    seq = parseInt(parts[parts.length - 1] ?? "0", 10) + 1;
  }

  return `${prefix}-${String(seq).padStart(5, "0")}`;
};

/**
 * Generate referralCode unik.
 * Format: REF-{NAME_SLUG}-{3RAND}
 * Contoh: REF-JESSICA-4A2
 *
 * Makna: Identitas referrer langsung terlihat dari kode
 */
export const generateReferralCode = async (
  referrerName: string
): Promise<string> => {
  const slug = referrerName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);

  let code: string;
  let exists = true;

  do {
    code = `REF-${slug}-${randStr(3)}`;
    const found = await prisma.referralCode.findUnique({ where: { code } });
    exists = !!found;
  } while (exists);

  return code;
};