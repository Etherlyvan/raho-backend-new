import { PrismaClient, SessionStatus, AuthorRole } from '../src/generated/prisma';

const prisma = new PrismaClient();

export async function seedSprint7() {
  console.log('\n📦 Seeding Sprint 7 — Evaluasi Dokter & Lifecycle Sesi...');

  // ─── Resolve data dari sprint sebelumnya ─────────────────────────────────

  const doctor = await prisma.user.findUniqueOrThrow({
    where:  { email: 'dokter@raho.id' },
    select: { userId: true },
  });

  const memberUser = await prisma.user.findUnique({
    where:  { email: 'member.test@raho.id' },
    select: { userId: true },
  });
  if (!memberUser) throw new Error('member.test@raho.id belum ada. Jalankan Sprint 2 seed.');

  const member = await prisma.member.findFirstOrThrow({
    where:  { userId: memberUser.userId },
    select: { memberId: true },
  });

  const memberPackage = await prisma.memberPackage.findFirstOrThrow({
    where:  { memberId: member.memberId },
    select: { memberPackageId: true },
  });

  const encounter = await prisma.encounter.findFirstOrThrow({
    where:  { memberPackageId: memberPackage.memberPackageId },
    select: { encounterId: true, branchId: true },
  });

  // ─── Session 1 — transisi ke COMPLETED (jika belum) ─────────────────────

  const session1 = await prisma.treatmentSession.findFirst({
    where:  { encounterId: encounter.encounterId, infusKe: 1 },
    select: { treatmentSessionId: true, status: true },
  });

  if (session1 && session1.status !== 'COMPLETED') {
    await prisma.treatmentSession.update({
      where: { treatmentSessionId: session1.treatmentSessionId },
      data:  {
        status:      SessionStatus.COMPLETED,
        startedAt:   new Date('2026-04-01T08:00:00Z'),
        completedAt: new Date('2026-04-01T10:30:00Z'),
      },
    });
    console.log('  ✅ Session 1 → COMPLETED');
  } else {
    console.log('  ℹ️  Session 1 sudah COMPLETED, skip transisi.');
  }

  // ─── Session 2 — transisi ke INPROGRESS ──────────────────────────────────

  const session2 = await prisma.treatmentSession.findFirst({
    where:  { encounterId: encounter.encounterId, infusKe: 2 },
    select: { treatmentSessionId: true, status: true },
  });

  if (session2 && session2.status === 'PLANNED') {
    await prisma.treatmentSession.update({
      where: { treatmentSessionId: session2.treatmentSessionId },
      data:  {
        status:    SessionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
    console.log('  ✅ Session 2 → INPROGRESS');
  } else {
    console.log(`  ℹ️  Session 2 status: ${session2?.status ?? 'tidak ada'}, skip transisi.`);
  }

  // ─── Evaluasi Dokter untuk Session 1 ─────────────────────────────────────

  if (!session1) {
    console.warn('  ⚠️  Session 1 tidak ditemukan, skip evaluasi.');
    return;
  }

  const existingEval = await prisma.doctorEvaluation.findUnique({
    where:  { treatmentSessionId: session1.treatmentSessionId },
    select: { evaluationCode: true },
  });

  if (!existingEval) {
    // Generate kode EVL-PUS-YYMM-NNNNN
    const branch = await prisma.branch.findUniqueOrThrow({
      where:  { branchId: encounter.branchId },
      select: { branchCode: true },
    });
    const cab3   = branch.branchCode.slice(0, 3).toUpperCase();
    const now    = new Date();
    const yy     = String(now.getFullYear()).slice(-2);
    const mm     = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `EVL-${cab3}-${yy}${mm}-`;

    const count = await prisma.doctorEvaluation.count({
      where: { evaluationCode: { startsWith: prefix } },
    });
    const evaluationCode = `${prefix}${String(count + 1).padStart(5, '0')}`;

    await prisma.doctorEvaluation.create({
      data: {
        treatmentSessionId: session1.treatmentSessionId,
        doctorId:           doctor.userId,
        evaluationCode,
        subjective:
          'Pasien mengeluhkan badan masih lemas pasca infus pertama. Kesemutan di tangan berkurang 40%. Tekanan darah membaik dari 158/98 menjadi 142/88 mmHg.',
        objective:
          'TD: 142/88 mmHg. Nadi: 82x/mnt. SpO2: 98%. BMI stabil. Tidak ditemukan reaksi alergi atau ekstravasasi.',
        assessment:
          'Respons terapi positif pada sesi pertama. Penurunan TD 16/10 mmHg dalam satu sesi. Gejala neuropati perifer menunjukkan perbaikan awal.',
        plan:
          'Lanjutkan sesi ke-2 sesuai protokol. Tingkatkan dosis O3 sebesar 5ml pada sesi berikutnya. Monitor TD dan saturasi sebelum dan sesudah infus. Edukasi pasien untuk mengurangi konsumsi kopi.',
        evaluasiDokter:
          'Sesi pertama berjalan lancar tanpa komplikasi. Respons klinis baik, pasien kooperatif.',
      },
    });
    console.log(`  ✅ Evaluasi Dokter: ${evaluationCode}`);
  } else {
    console.log(`  ℹ️  Evaluasi Session 1 sudah ada (${existingEval.evaluationCode}), skip.`);
  }

  // ─── Summary IDs ─────────────────────────────────────────────────────────

  const totalEval = await prisma.doctorEvaluation.count();
  console.log(`  📊 Total DoctorEvaluation di DB: ${totalEval}`);
  console.log(`  📋 Test PATCH status:`);
  console.log(`     Session 2 ID: ${session2?.treatmentSessionId}`);
  console.log(`     PATCH /treatment-sessions/{id}/status  { "status": "COMPLETED" }`);
  console.log(`  📋 Test GET/POST evaluasi:`);
  console.log(`     Session 1 ID: ${session1.treatmentSessionId}`);
  console.log(`     GET  /treatment-sessions/{id}/evaluation`);
  console.log(`     POST /treatment-sessions/{id}/evaluation`);
  console.log('✅ [Sprint 7] Seeder selesai.\n');
}