import {
  PrismaClient,
  MemberStatus,
  RoleName,
} from '../src/generated/prisma';
import bcrypt from 'bcryptjs';
import { generateMemberNo, generateStaffCode } from '../src/utils/uniqueCode';

const prisma = new PrismaClient();

export async function seedSprint8() {
  console.log('\n🌱 Seeding Sprint 8 — Member Management...\n');

  const branch = await prisma.branch.findUniqueOrThrow({
    where: { branchCode: 'PUSAT' },
  });

  const memberRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'MEMBER' },
  });

  const adminLayanan = await prisma.user.findUniqueOrThrow({
    where: { email: 'admlayn@raho.id' },
  });

  // ─── 2 Referral Code aktif ──────────────────────────────────────────────────

  const ref1 = await prisma.referralCode.upsert({
    where : { code: 'REF-JESSICA-A01' },
    create: {
      code        : 'REF-JESSICA-A01',
      referrerName: 'dr. Jessica Hartono',
      description : 'Referral dari dr. Jessica partner RAHO Pusat',
      isActive    : true,
    },
    update: {},
  });

  const ref2 = await prisma.referralCode.upsert({
    where : { code: 'REF-BUDI-B02' },
    create: {
      code        : 'REF-BUDI-B02',
      referrerName: 'Budi Santoso (Apoteker)',
      description : 'Referral dari apoteker mitra',
      isActive    : true,
    },
    update: {},
  });

  console.log('✅ Referral Codes:');
  console.log(`   ${ref1.code} — ${ref1.referrerName}`);
  console.log(`   ${ref2.code} — ${ref2.referrerName}`);

  // ─── Helper: buat member+user ───────────────────────────────────────────────

  const upsertMember = async (opts: {
    email      : string;
    password   : string;
    fullName   : string;
    phone      : string;
    status     : MemberStatus;
    voucherCount: number;
    referralCodeId?: string;
    isConsentToPhoto?: boolean;
  }) => {
    let user = await prisma.user.findUnique({ where: { email: opts.email } });

    if (!user) {
      const staffCode    = await generateStaffCode('MEMBER');
      const passwordHash = await bcrypt.hash(opts.password, 12);
      user = await prisma.user.create({
        data: {
          email: opts.email,
          passwordHash,
          staffCode,
          roleId  : memberRole.roleId,
          branchId: branch.branchId,
          isActive: true,
        },
      });
      await prisma.userProfile.create({
        data: { userId: user.userId, fullName: opts.fullName },
      });
    }

    let member = await prisma.member.findUnique({ where: { userId: user.userId } });

    if (!member) {
      const memberNo = await generateMemberNo(branch.branchId);
      member = await prisma.member.create({
        data: {
          memberNo,
          userId              : user.userId,
          registrationBranchId: branch.branchId,
          fullName            : opts.fullName,
          phone               : opts.phone,
          status              : opts.status,
          voucherCount        : opts.voucherCount,
          referralCodeId      : opts.referralCodeId,
          isConsentToPhoto    : opts.isConsentToPhoto ?? false,
        },
      });
    }

    return { user, member };
  };

  // ─── 5 Member uji ──────────────────────────────────────────────────────────

  const { member: m1 } = await upsertMember({
    email        : 'sari.wulandari@raho.id',
    password     : 'Member123!',
    fullName     : 'Sari Wulandari',
    phone        : '081111111111',
    status       : 'ACTIVE',
    voucherCount : 5,
    referralCodeId: ref1.referralCodeId,
    isConsentToPhoto: true,
  });

  const { member: m2 } = await upsertMember({
    email        : 'hendra.kurnia@raho.id',
    password     : 'Member123!',
    fullName     : 'Hendra Kurniawan',
    phone        : '082222222222',
    status       : 'ACTIVE',
    voucherCount : 12,
    referralCodeId: ref2.referralCodeId,
  });

  const { member: m3 } = await upsertMember({
    email        : 'dewi.anggraeni@raho.id',
    password     : 'Member123!',
    fullName     : 'Dewi Anggraeni',
    phone        : '083333333333',
    status       : 'INACTIVE',
    voucherCount : 0,
  });

  const { member: m4 } = await upsertMember({
    email        : 'agus.salim@raho.id',
    password     : 'Member123!',
    fullName     : 'Agus Salim Prasetyo',
    phone        : '084444444444',
    status       : 'ACTIVE',
    voucherCount : 7,
    referralCodeId: ref1.referralCodeId,
  });

  // Member ke-5 = calon lintas cabang
  const { member: m5 } = await upsertMember({
    email        : 'linda.cahyani@raho.id',
    password     : 'Member123!',
    fullName     : 'Linda Cahyani',
    phone        : '085555555555',
    status       : 'ACTIVE',
    voucherCount : 3,
  });

  console.log('\n✅ Members dibuat:');
  console.log(`   [1] ${m1.memberNo} — ${m1.fullName} (ACTIVE, voucher: ${m1.voucherCount})`);
  console.log(`   [2] ${m2.memberNo} — ${m2.fullName} (ACTIVE, voucher: ${m2.voucherCount})`);
  console.log(`   [3] ${m3.memberNo} — ${m3.fullName} (INACTIVE)`);
  console.log(`   [4] ${m4.memberNo} — ${m4.fullName} (ACTIVE, voucher: ${m4.voucherCount})`);
  console.log(`   [5] ${m5.memberNo} — ${m5.fullName} (ACTIVE — kandidat lintas cabang)`);

  // ─── Grant akses lintas cabang untuk m5 ────────────────────────────────────
  // Simulasi: m5 registrasi di PUSAT, tapi bisa dilayani di cabang PUSAT juga
  // untuk test grant-access flow, kita skip jika sudah ada

  const existAccess = await prisma.branchMemberAccess.findFirst({
    where: { memberId: m5.memberId, branchId: branch.branchId, isActive: true },
  });

  if (!existAccess && m5.registrationBranchId !== branch.branchId) {
    await prisma.branchMemberAccess.create({
      data: {
        memberId : m5.memberId,
        branchId : branch.branchId,
        grantedBy: adminLayanan.userId,
        isActive : true,
        notes    : 'Grant akses seed Sprint 8 — uji lintas cabang',
      },
    });
    console.log(`\n✅ BranchMemberAccess: ${m5.fullName} → PUSAT`);
  } else {
    console.log(`\n⏭  BranchMemberAccess ${m5.fullName} sudah ada / sama cabang, skip`);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log('\n─────────────────────────────────────────────');
  console.log('📋 Sprint 8 Seed Summary');
  console.log('─────────────────────────────────────────────');
  console.log('Akun member untuk test GET /members:');
  console.log('  sari.wulandari@raho.id   Member123!');
  console.log('  hendra.kurnia@raho.id    Member123!');
  console.log('  dewi.anggraeni@raho.id   Member123!  (INACTIVE)');
  console.log('  agus.salim@raho.id       Member123!');
  console.log('  linda.cahyani@raho.id    Member123!');
  console.log('');
  console.log('Referral Code aktif:');
  console.log('  REF-JESSICA-A01 — dr. Jessica Hartono');
  console.log('  REF-BUDI-B02    — Budi Santoso (Apoteker)');
  console.log('─────────────────────────────────────────────\n');
}