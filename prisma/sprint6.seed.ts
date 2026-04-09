import {
  PrismaClient,
  SessionStatus,
  PelaksanaanType,
} from '../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Sprint 6 Seeder — Terapi Plan
 *
 * planCode format : TP-{3-huruf-branchCode}-{YYMM}-{NNNNN}
 * Branch PUSAT    → slice(0,3).toUpperCase() = 'PUS'
 * Contoh          : TP-PUS-2604-00001
 */
export async function seedSprint6() {
  console.log('🌱 [Sprint 6] Seeding Terapi Plan data...');

  // ─── Resolve data dari seed sebelumnya ────────────────────────────────────

  // FIX: branchCode adalah 'PUSAT', bukan 'PST'
  const branch = await prisma.branch.findFirst({
    where:  { branchCode: 'PUSAT' },
    select: { branchId: true, branchCode: true },
  });
  if (!branch) throw new Error('Branch PUSAT tidak ditemukan. Jalankan sprint1 seed terlebih dahulu.');

  // planCode prefix mengikuti generatePlanCode: slice 3 huruf pertama
  const branchSlug = branch.branchCode.slice(0, 3).toUpperCase(); // 'PUS'
  const now        = new Date();
  const yy         = String(now.getFullYear()).slice(-2);
  const mm         = String(now.getMonth() + 1).padStart(2, '0');
  const codePrefix = `TP-${branchSlug}-${yy}${mm}-`; // TP-PUS-2604-

  const doctor = await prisma.user.findFirst({
    where:  { role: { name: 'DOCTOR' }, branchId: branch.branchId },
    select: { userId: true },
  });
  if (!doctor) throw new Error('User DOCTOR tidak ditemukan di branch PUSAT.');

  // Ambil member via email konsisten dengan seed sebelumnya
  const memberUser = await prisma.user.findUnique({
    where:  { email: 'member.test@raho.id' },
    select: { userId: true },
  });
  if (!memberUser) throw new Error('member.test@raho.id belum ada. Jalankan Sprint 2 seed terlebih dahulu.');

  const member = await prisma.member.findFirst({
    where:  { userId: memberUser.userId },
    select: { memberId: true },
  });
  if (!member) throw new Error('Member belum ada.');

  const memberPackage = await prisma.memberPackage.findFirst({
    where:  { memberId: member.memberId },
    select: { memberPackageId: true },
  });
  if (!memberPackage) throw new Error('MemberPackage belum ada.');

  const encounter = await prisma.encounter.findFirst({
    where:  { memberPackageId: memberPackage.memberPackageId },
    select: { encounterId: true },
  });
  if (!encounter) throw new Error('Encounter belum ada.');

  // ─── 1. Backfill planCode untuk SessionTherapyPlan yang belum punya kode ──

  const plansWithoutCode = await prisma.sessionTherapyPlan.findMany({
    where:   { planCode: null },
    orderBy: { createdAt: 'asc' },
    select:  { sessionTherapyPlanId: true },
  });

  for (let i = 0; i < plansWithoutCode.length; i++) {
    const planCode = `${codePrefix}${String(i + 1).padStart(5, '0')}`;
    await prisma.sessionTherapyPlan.update({
      where: { sessionTherapyPlanId: plansWithoutCode[i].sessionTherapyPlanId },
      data:  { planCode },
    });
    console.log(`  ✅ Backfill planCode: ${planCode}`);
  }

  if (plansWithoutCode.length === 0) {
    console.log('  ℹ️  Semua plan sudah punya planCode, skip backfill.');
  }

  // ─── 2. Hitung urutan berikutnya setelah backfill ─────────────────────────

  const lastPlan = await prisma.sessionTherapyPlan.findFirst({
    where:   { planCode: { startsWith: codePrefix } },
    orderBy: { planCode: 'desc' },
    select:  { planCode: true },
  });

  const nextSeq = lastPlan?.planCode
    ? parseInt(lastPlan.planCode.slice(-5), 10) + 1
    : 1;

  // ─── 3. Session 3 (PLANNED) + TherapyPlan ─────────────────────────────────

  let session3 = await prisma.treatmentSession.findFirst({
    where:  { encounterId: encounter.encounterId, infusKe: 3 },
    select: { treatmentSessionId: true },
  });

  if (!session3) {
    session3 = await prisma.treatmentSession.create({
      data: {
        encounterId:   encounter.encounterId,
        infusKe:       3,
        pelaksanaan:   PelaksanaanType.KLINIK,
        treatmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status:        SessionStatus.PLANNED,
      },
      select: { treatmentSessionId: true },
    });
    console.log(`  ✅ Session 3 (PLANNED): ${session3.treatmentSessionId}`);
  } else {
    console.log(`  ℹ️  Session 3 sudah ada: ${session3.treatmentSessionId}`);
  }

  const existingPlan3 = await prisma.sessionTherapyPlan.findUnique({
    where:  { treatmentSessionId: session3.treatmentSessionId },
    select: { planCode: true },
  });

  if (!existingPlan3) {
    const planCode3 = `${codePrefix}${String(nextSeq).padStart(5, '0')}`;
    await prisma.sessionTherapyPlan.create({
      data: {
        treatmentSessionId: session3.treatmentSessionId,
        planCode:           planCode3,
        plannedBy:          doctor.userId,
        ifaMg:    15.0,
        hhoMl:    20.0,
        h2Ml:     10.0,
        noMl:     5.0,
        gasoMl:   5.0,
        o2Ml:     100.0,
        o3Ml:     80.0,
        edtaMl:   2.0,
        mbMl:     1.5,
        h2sMl:    3.0,
        kclMl:    4.0,
        jmlNbMl:  500.0,
        keterangan: 'Peningkatan dosis O3 dari sesi sebelumnya. Pantau respons pasien.',
      },
    });
    console.log(`  ✅ TherapyPlan Session 3: ${planCode3}`);
  } else {
    console.log(`  ℹ️  TherapyPlan Session 3 sudah ada (${existingPlan3.planCode}), skip.`);
  }

  // ─── 4. Session 4 (PLANNED, tanpa plan) — untuk test POST via API ─────────

  const session4 = await prisma.treatmentSession.findFirst({
    where:  { encounterId: encounter.encounterId, infusKe: 4 },
    select: { treatmentSessionId: true },
  });

  if (!session4) {
    const s4 = await prisma.treatmentSession.create({
      data: {
        encounterId:   encounter.encounterId,
        infusKe:       4,
        pelaksanaan:   PelaksanaanType.KLINIK,
        treatmentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status:        SessionStatus.PLANNED,
      },
      select: { treatmentSessionId: true },
    });
    console.log(`  ✅ Session 4 (PLANNED, tanpa plan): ${s4.treatmentSessionId}`);
    console.log(`  📋 Gunakan ID ini untuk test POST: ${s4.treatmentSessionId}`);
  } else {
    console.log(`  ℹ️  Session 4 sudah ada (${session4.treatmentSessionId}), skip.`);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────

  const totalPlans = await prisma.sessionTherapyPlan.count();
  console.log(`  📊 Total SessionTherapyPlan di DB: ${totalPlans}`);
  console.log('✅ [Sprint 6] Seeder selesai.\n');
}