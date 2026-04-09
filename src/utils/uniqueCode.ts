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

// Tambahkan di bawah generateReferralCode (jangan timpa isi yang lama)

type MutationTypeCode = "USE" | "RCV" | "ADJ" | "RTN";

/**
 * Generate referensi unik untuk StockMutation.
 * Format: STK-{TYPE}-{BRANCH_3}-{YYYYMMDD}-{SEQ_4}
 * Contoh: STK-USE-PST-20260409-0001
 *         │   │   │   │        └── Nomor urut hari ini di cabang (4 digit)
 *         │   │   │   └────────── Tanggal YYYYMMDD
 *         │   │   └────────────── Kode cabang 3 huruf
 *         │   └────────────────── Tipe: USE/RCV/ADJ/RTN
 *         └────────────────────── Prefix: Stock Mutation
 */
export const generateMutationRef = async (
  type: MutationTypeCode,
  branchId: string
): Promise<string> => {
  const branch = await prisma.branch.findUnique({
    where:  { branchId },
    select: { branchCode: true },
  });

  const branchCode = (branch?.branchCode ?? "UNK").slice(0, 3).toUpperCase();
  const today      = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix     = `STK-${type}-${branchCode}-${today}`;

  const count = await prisma.stockMutation.count({
    where: { branchId, notes: { startsWith: prefix } },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
};

// ─── Kode Foto Sesi ───────────────────────────────────────────────────────────
// Format : PHO.{YYYYMMDD}.{SES6}.{RAND4}.{ext}
// Contoh : PHO.20260409.CLT7MG.K9MR.jpg
// Makna  : PHO=jenis file, YYYYMMDD=tanggal foto, SES6=6 huruf ID sesi
//          (agar file bisa dilacak ke sesi asalnya), RAND4=random anti-collision
// ─────────────────────────────────────────────────────────────────────────────
export const generatePhotoFileName = (sessionId: string, ext: string): string => {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const ses6 = sessionId.slice(0, 6).toUpperCase();
  return `PHO.${yyyymmdd}.${ses6}.${randStr(4)}${ext}`;
};