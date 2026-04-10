import {
  PrismaClient,
  MemberPackageStatus,
} from '../../generated/prisma';
import { AppError }              from '../../utils/AppError';
import { assertMemberAccess }    from '../../utils/memberAccess';
// ✅ FIX: auditLog.helper (bukan auditLog)
import { logAudit }              from '../../utils/auditLog.helper';
import { generatePackageCode }   from '../../utils/generateCode';
import type { RequestUser }      from '../../types/express';

const prisma = new PrismaClient();

// ─── List PackagePricing aktif ────────────────────────────────────────────────
export async function listPackagePricings(branchId: string) {
  return prisma.packagePricing.findMany({
    where:   { branchId, isActive: true },
    orderBy: [{ packageType: 'asc' }, { totalSessions: 'asc' }],
  });
}

// ─── List Paket Member ────────────────────────────────────────────────────────
// ✅ FIX: terima user: RequestUser bukan 3 arg terpisah
export async function listMemberPackages(memberId: string, user: RequestUser) {
  await assertMemberAccess(memberId, user);   // ✅ 2 args

  const packages = await prisma.memberPackage.findMany({
    where:   { memberId },
    include: { branch: true, packagePricing: true },
    orderBy: { createdAt: 'desc' },
  });

  return packages.map((pkg) => ({
    ...pkg,
    packageCode: generatePackageCode(
      pkg.branch.branchCode,
      pkg.packageType,
      pkg.memberPackageId,
      pkg.createdAt,
    ),
  }));
}

// ─── Assign Paket ─────────────────────────────────────────────────────────────
// ✅ FIX: terima user: RequestUser
export async function assignPackage(
  memberId : string,
  user     : RequestUser,
  payload  : {
    packagePricingId : string;
    discountPercent? : number;
    discountAmount?  : number;
    discountNote?    : string;
    notes?           : string;
  },
) {
  await assertMemberAccess(memberId, user);   // ✅ 2 args

  const pricing = await prisma.packagePricing.findFirst({
    where:   { packagePricingId: payload.packagePricingId, isActive: true },
    include: { branch: true },
  });
  if (!pricing) throw new AppError('Harga paket tidak ditemukan atau tidak aktif', 404);

  const discountPercent = payload.discountPercent ?? 0;
  const discountAmount  = payload.discountAmount  ?? 0;
  const finalPrice      = Math.max(0, pricing.price - discountAmount);

  const pkg = await prisma.$transaction(async (tx) => {
    const created = await tx.memberPackage.create({
      data: {
        memberId,
        branchId:         pricing.branchId,
        packagePricingId: pricing.packagePricingId,
        packageType:      pricing.packageType,
        packageName:      pricing.packageName,
        totalSessions:    pricing.totalSessions,
        originalPrice:    pricing.price,
        discountPercent,
        discountAmount,
        finalPrice,
        discountNote:     payload.discountNote,
        notes:            payload.notes,
        status:           MemberPackageStatus.PENDING_PAYMENT,
      },
      include: { branch: true },
    });

    await tx.member.update({
      where: { memberId },
      data:  { voucherCount: { increment: created.totalSessions } },
    });

    return created;
  });

  await logAudit({
    userId:     user.userId,
    action:     'CREATE',
    resource:   'MemberPackage',
    resourceId: pkg.memberPackageId,
    meta:       { memberId, packageType: pkg.packageType, finalPrice },
  });

  return {
    ...pkg,
    packageCode: generatePackageCode(
      pkg.branch.branchCode,
      pkg.packageType,
      pkg.memberPackageId,
      pkg.createdAt,
    ),
  };
}

// ─── Verifikasi Pembayaran ────────────────────────────────────────────────────
// ✅ FIX: terima user: RequestUser
export async function verifyPackage(
  memberId  : string,
  packageId : string,
  user      : RequestUser,
) {
  await assertMemberAccess(memberId, user);   // ✅ 2 args

  const pkg = await prisma.memberPackage.findFirst({
    where: { memberPackageId: packageId, memberId },
  });
  if (!pkg) throw new AppError('Paket tidak ditemukan', 404);
  if (pkg.status !== MemberPackageStatus.PENDING_PAYMENT) {
    throw new AppError('Hanya paket PENDING_PAYMENT yang bisa diverifikasi', 422);
  }

  const now     = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.memberPackage.update({
      where: { memberPackageId: packageId },
      data: {
        status:      MemberPackageStatus.ACTIVE,
        paidAt:      now,
        verifiedBy:  user.userId,
        verifiedAt:  now,
        activatedAt: now,
      },
      include: { branch: true },
    });

    await tx.member.updateMany({
      where: { memberId, status: 'LEAD' },
      data:  { status: 'ACTIVE' },
    });

    return result;
  });

  await logAudit({
    userId:     user.userId,
    action:     'APPROVE',
    resource:   'MemberPackage',
    resourceId: packageId,
    meta:       { status: 'ACTIVE', verifiedBy: user.userId },
  });

  return {
    ...updated,
    packageCode: generatePackageCode(
      updated.branch.branchCode,
      updated.packageType,
      updated.memberPackageId,
      updated.createdAt,
    ),
  };
}