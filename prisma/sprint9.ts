import {
  PrismaClient,
  PackageType,
  MemberPackageStatus,
  EncounterType,
  EncounterStatus,
  SessionStatus,
  PelaksanaanType,
  // ✅ FIX: tambah Prisma untuk type TransactionClient
  Prisma,
// ✅ FIX: path benar (dari prisma/ ke src/ = satu level naik)
} from '../src/generated/prisma';
import {
  generatePackageCode,
  generateEncounterCode,
  generateSessionCode,
// ✅ FIX: path benar
} from '../src/utils/generateCode';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeder Sprint 9: PackagePricing → MemberPackage → Encounter → Session\n');

  const [adminManager, adminCabang, doctor, branch, member] = await Promise.all([
    prisma.user.findFirst({ where: { role: { name: 'ADMIN_MANAGER' } } }),
    prisma.user.findFirst({ where: { role: { name: 'ADMIN_CABANG'  } } }),
    prisma.user.findFirst({ where: { role: { name: 'DOCTOR'        } } }),
    prisma.branch.findFirst({ where: { branchCode: { not: 'PUSAT' } } }),
    prisma.member.findFirst({ include: { user: true } }),
  ]);

  if (!adminManager || !adminCabang || !doctor || !branch || !member) {
    throw new Error('❌ Jalankan seeder Sprint 1–8 terlebih dahulu.');
  }

  console.log(`📍 Cabang  : ${branch.name} (${branch.branchCode})`);
  console.log(`👤 Member  : ${member.fullName} (${member.memberNo})\n`);

  // ─── PackagePricing ───────────────────────────────────────────────────────
  console.log('📦 PackagePricing...');

  const [basicS, , booster] = await Promise.all([
    prisma.packagePricing.upsert({
      where:  { branchId_packageType_totalSessions: { branchId: branch.branchId, packageType: PackageType.BASIC,   totalSessions: 7  } },
      update: {},
      create: { branchId: branch.branchId, packageType: PackageType.BASIC,   packageName: 'Paket Basic 7 Sesi',    totalSessions: 7,  price: 3_500_000, setBy: adminManager.userId },
    }),
    prisma.packagePricing.upsert({
      where:  { branchId_packageType_totalSessions: { branchId: branch.branchId, packageType: PackageType.BASIC,   totalSessions: 15 } },
      update: {},
      create: { branchId: branch.branchId, packageType: PackageType.BASIC,   packageName: 'Paket Basic 15 Sesi',   totalSessions: 15, price: 6_500_000, setBy: adminManager.userId },
    }),
    prisma.packagePricing.upsert({
      where:  { branchId_packageType_totalSessions: { branchId: branch.branchId, packageType: PackageType.BOOSTER, totalSessions: 15 } },
      update: {},
      create: { branchId: branch.branchId, packageType: PackageType.BOOSTER, packageName: 'Paket Booster 15 Sesi', totalSessions: 15, price: 7_000_000, setBy: adminManager.userId },
    }),
  ]);

  console.log(`   ✅ 3 PackagePricing di-upsert`);

  // ─── MemberPackage PENDING_PAYMENT ────────────────────────────────────────
  console.log('\n💳 MemberPackage PENDING_PAYMENT...');

  const existPending = await prisma.memberPackage.findFirst({
    where: { memberId: member.memberId, packagePricingId: booster.packagePricingId },
  });

  let pendingPkg = existPending;
  if (!existPending) {
    // ✅ FIX: type tx secara explicit
    pendingPkg = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pkg = await tx.memberPackage.create({
        data: {
          memberId:         member.memberId,
          branchId:         branch.branchId,
          packagePricingId: booster.packagePricingId,
          packageType:      PackageType.BOOSTER,
          packageName:      booster.packageName,
          totalSessions:    booster.totalSessions,
          originalPrice:    booster.price,
          discountPercent:  10,
          discountAmount:   700_000,
          finalPrice:       6_300_000,
          discountNote:     'Diskon loyalitas member lama 10%',
          status:           MemberPackageStatus.PENDING_PAYMENT,
        },
      });
      await tx.member.update({
        where: { memberId: member.memberId },
        data:  { voucherCount: { increment: booster.totalSessions } },
      });
      return pkg;
    });
    const code = generatePackageCode(branch.branchCode, PackageType.BOOSTER, pendingPkg!.memberPackageId, pendingPkg!.createdAt);
    console.log(`   ✅ ${code} | Rp ${pendingPkg!.finalPrice.toLocaleString('id-ID')} | PENDING_PAYMENT`);
  } else {
    console.log(`   ℹ️  Sudah ada, skip.`);
  }

  // ─── MemberPackage ACTIVE ─────────────────────────────────────────────────
  console.log('\n✅ MemberPackage ACTIVE...');

  const existActive = await prisma.memberPackage.findFirst({
    where: { memberId: member.memberId, packagePricingId: basicS.packagePricingId, status: MemberPackageStatus.ACTIVE },
  });

  let activePkg = existActive;
  if (!existActive) {
    const now = new Date();
    // ✅ FIX: type tx secara explicit
    activePkg = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pkg = await tx.memberPackage.create({
        data: {
          memberId:         member.memberId,
          branchId:         branch.branchId,
          packagePricingId: basicS.packagePricingId,
          packageType:      PackageType.BASIC,
          packageName:      basicS.packageName,
          totalSessions:    basicS.totalSessions,
          originalPrice:    basicS.price,
          discountPercent:  0,
          discountAmount:   0,
          finalPrice:       basicS.price,
          status:           MemberPackageStatus.ACTIVE,
          paidAt:           now,
          verifiedBy:       adminCabang.userId,
          verifiedAt:       now,
          activatedAt:      now,
        },
      });
      await tx.member.update({
        where: { memberId: member.memberId },
        data:  { voucherCount: { increment: basicS.totalSessions }, status: 'ACTIVE' },
      });
      return pkg;
    });
    const code = generatePackageCode(branch.branchCode, PackageType.BASIC, activePkg!.memberPackageId, activePkg!.createdAt);
    console.log(`   ✅ ${code} | Rp ${activePkg!.finalPrice.toLocaleString('id-ID')} | ACTIVE`);
  } else {
    console.log(`   ℹ️  Sudah ada, skip.`);
  }

  // ─── Encounter ────────────────────────────────────────────────────────────
  console.log('\n🏥 Encounter...');

  const existEnc = await prisma.encounter.findFirst({
    where:   { memberId: member.memberId, memberPackageId: activePkg!.memberPackageId },
    include: { branch: true },
  });

  let encounter = existEnc;
  if (!existEnc) {
    encounter = await prisma.encounter.create({
      data: {
        memberId:        member.memberId,
        doctorId:        doctor.userId,
        branchId:        branch.branchId,
        memberPackageId: activePkg!.memberPackageId,
        type:            EncounterType.TREATMENT,
        status:          EncounterStatus.ONGOING,
        treatmentDate:   new Date(),
        assessment:      { notes: 'Kunjungan pertama, terapi dasar.' },
      },
      include: { branch: true },
    });
    const code = generateEncounterCode(branch.branchCode, EncounterType.TREATMENT, encounter.encounterId, encounter.createdAt);
    console.log(`   ✅ ${code} | TREATMENT | ONGOING`);
  } else {
    console.log(`   ℹ️  Sudah ada, skip.`);
  }

  // ─── TreatmentSession ─────────────────────────────────────────────────────
  console.log('\n💉 TreatmentSession...');

  const existSes = await prisma.treatmentSession.findFirst({
    where: { encounterId: encounter!.encounterId, infusKe: 1 },
  });

  if (!existSes) {
    // ✅ FIX: type tx secara explicit
    const session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const s = await tx.treatmentSession.create({
        data: {
          encounterId:    encounter!.encounterId,
          pelaksanaan:    PelaksanaanType.KLINIK,
          infusKe:        1,
          treatmentDate:  new Date(),
          status:         SessionStatus.PLANNED,
          keluhanSebelum: 'Kelelahan, sering pusing, kurang fokus.',
        },
      });
      await tx.member.update({
        where: { memberId: member.memberId },
        data:  { voucherCount: { decrement: 1 } },
      });
      return s;
    });

    const code = generateSessionCode(branch.branchCode, 1, session.treatmentSessionId, session.createdAt);
    console.log(`   ✅ ${code} | Infus ke-1 | PLANNED | KLINIK`);
  } else {
    console.log(`   ℹ️  Sudah ada, skip.`);
  }

  const finalMember = await prisma.member.findUnique({ where: { memberId: member.memberId } });

  console.log('\n─────────────────────────────────────────────');
  console.log('📊 Ringkasan Sprint 9:');
  console.log(`   VoucherCount ${member.fullName}: ${finalMember?.voucherCount}`);
  console.log('─────────────────────────────────────────────');
  console.log('\n✅ Seeder Sprint 9 selesai!\n');
}

main()
  .catch((e) => { console.error('❌ Seeder gagal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());