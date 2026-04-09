/// <reference types="node" />
import {
  PrismaClient,
  RoleName,
  PackageType,
  MemberPackageStatus,
  EncounterType,
  EncounterStatus,
  PelaksanaanType,
  SessionStatus,
  VitalSignType,
  VitalSignTiming,
  JenisBotol,
  MutationType,
  InventoryCategory,
} from "../src/generated/prisma";
import bcrypt from "bcryptjs";
import { generateStaffCode } from "../src/utils/uniqueCode";

const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: RoleName[] = [
  "SUPER_ADMIN", "ADMIN_MANAGER", "ADMIN_CABANG",
  "ADMIN_LAYANAN", "DOCTOR", "NURSE", "MEMBER",
];

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  SUPER_ADMIN:   ["*"],
  ADMIN_MANAGER: ["branch:*", "package-pricing:*", "shipment:read", "user:manage-branch", "report:read"],
  ADMIN_CABANG:  ["member:read", "inventory:*", "stock-request:create", "shipment:approve", "user:manage-branch", "branch:stats"],
  ADMIN_LAYANAN: ["member:*", "encounter:*", "session:*", "package:assign", "invoice:read", "notification:send"],
  DOCTOR:        ["session:read", "therapy-plan:*", "diagnosis:*", "evaluation:*", "vital-sign:read"],
  NURSE:         ["session:read", "vital-sign:*", "infusion:*", "material:*", "photo:*", "emr-note:create"],
  MEMBER:        ["me:read", "me:sessions", "me:invoices", "me:notifications", "me:chat"],
};

// ─── Sprint 1 ─────────────────────────────────────────────────────────────────

async function seedRoles() {
  console.log("📦 Seeding roles...");
  for (const roleName of ALL_ROLES) {
    await prisma.role.upsert({
      where:  { name: roleName },
      update: { permissions: ROLE_PERMISSIONS[roleName] },
      create: { name: roleName, permissions: ROLE_PERMISSIONS[roleName] },
    });
    console.log(`  ✅ Role: ${roleName}`);
  }
}

async function seedDefaultBranch() {
  console.log("🏢 Seeding default branch (Pusat)...");
  await prisma.branch.upsert({
    where:  { branchCode: "PUSAT" },
    update: {},
    create: {
      branchCode:     "PUSAT",
      name:           "RAHO Klinik Pusat",
      address:        "Jl. Raya Pusat No. 1",
      city:           "Jakarta",
      phone:          "02100000001",
      tipe:           "KLINIK",
      operatingHours: "Senin-Sabtu 08:00-17:00",
      isActive:       true,
    },
  });
  console.log("  ✅ Branch: PUSAT");
}

async function seedSuperAdmin() {
  console.log("👤 Seeding Super Admin...");
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  const email          = "superadmin@raho.id";
  const existingUser   = await prisma.user.findUnique({ where: { email } });
  const staffCode      = existingUser?.staffCode ?? await generateStaffCode("SUPER_ADMIN");
  const passwordHash   = await bcrypt.hash("Admin@RAHO2024!", 12);

  const superAdmin = await prisma.user.upsert({
    where:  { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash, staffCode, roleId: superAdminRole.roleId, isActive: true },
  });

  await prisma.userProfile.upsert({
    where:  { userId: superAdmin.userId },
    update: {},
    create: { userId: superAdmin.userId, fullName: "Super Administrator RAHO", phone: "081200000000" },
  });

  console.log(`  ✅ Super Admin: ${email}`);
}

async function seedTestUsers() {
  console.log("🧪 Seeding test users per role...");
  const branch = await prisma.branch.findUniqueOrThrow({ where: { branchCode: "PUSAT" } });

  const testUsers: Array<{
    email: string; fullName: string; role: RoleName; withBranch: boolean;
  }> = [
    { email: "manager@raho.id",   fullName: "Admin Manager Test", role: "ADMIN_MANAGER", withBranch: false },
    { email: "admcabang@raho.id", fullName: "Admin Cabang Test",  role: "ADMIN_CABANG",  withBranch: true  },
    { email: "admlayn@raho.id",   fullName: "Admin Layanan Test", role: "ADMIN_LAYANAN", withBranch: true  },
    { email: "dokter@raho.id",    fullName: "dr. Test Dokter",    role: "DOCTOR",        withBranch: true  },
    { email: "nakes@raho.id",     fullName: "Nakes Test",         role: "NURSE",         withBranch: true  },
  ];

  for (const u of testUsers) {
    const role         = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });
    const passwordHash = await bcrypt.hash("Test@1234!", 12);
    const existingUser = await prisma.user.findUnique({ where: { email: u.email } });
    const staffCode    = existingUser?.staffCode ?? await generateStaffCode(u.role);

    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: { passwordHash, isActive: true },
      create: {
        email: u.email, passwordHash, staffCode,
        roleId:   role.roleId,
        branchId: u.withBranch ? branch.branchId : null,
        isActive: true,
      },
    });

    await prisma.userProfile.upsert({
      where:  { userId: user.userId },
      update: {},
      create: { userId: user.userId, fullName: u.fullName },
    });

    console.log(`  ✅ ${u.role}: ${u.email}`);
  }
  console.log("  🔐 Password semua test user: Test@1234!");
}

// ─── Sprint 2 ─────────────────────────────────────────────────────────────────

const generateMemberNo = async (branchId: string): Promise<string> => {
  const branch     = await prisma.branch.findUniqueOrThrow({ where: { branchId } });
  const cabangKode = branch.branchCode.slice(0, 3).toUpperCase();
  const kotaKode   = branch.city.slice(0, 3).toUpperCase();
  const tahun      = new Date().getFullYear().toString().slice(-2);
  const prefix     = `${cabangKode}.${kotaKode}.${tahun}.`;
  const count      = await prisma.member.count({ where: { memberNo: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
};

async function seedSprint2() {
  console.log("\n📦 Seeding Sprint 2 — Tanda Vital...");

  const superAdmin = await prisma.user.findUniqueOrThrow({ where: { email: "superadmin@raho.id" } });
  const doctor     = await prisma.user.findUniqueOrThrow({ where: { email: "dokter@raho.id" } });
  const nurse      = await prisma.user.findUniqueOrThrow({ where: { email: "nakes@raho.id" } });
  const branch     = await prisma.branch.findUniqueOrThrow({ where: { branchCode: "PUSAT" } });
  const memberRole = await prisma.role.findUniqueOrThrow({ where: { name: "MEMBER" } });

  // 1. PackagePricing — BASIC 7 sesi
  const packagePricing = await prisma.packagePricing.upsert({
    where: {
      branchId_packageType_totalSessions: {
        branchId:      branch.branchId,
        packageType:   PackageType.BASIC,
        totalSessions: 7,
      },
    },
    create: {
      branchId:      branch.branchId,
      packageType:   PackageType.BASIC,
      packageName:   "Paket Basic 7 Sesi",
      totalSessions: 7,
      price:         1_500_000,
      isActive:      true,
      setBy:         superAdmin.userId,
    },
    update: {},
  });
  console.log(`  ✅ PackagePricing: ${packagePricing.packageName}`);

  // 2. User + Member (Budi Santoso)
  const memberEmail = "member.test@raho.id";
  const memberUser  = await prisma.user.upsert({
    where:  { email: memberEmail },
    create: {
      email:        memberEmail,
      passwordHash: await bcrypt.hash("Member@Test123!", 12),
      roleId:       memberRole.roleId,
      branchId:     branch.branchId,
      isActive:     true,
      profile: { create: { fullName: "Budi Santoso" } },
    },
    update: {},
  });

  const existingMember = await prisma.member.findFirst({ where: { userId: memberUser.userId } });
  const memberNo       = existingMember?.memberNo ?? await generateMemberNo(branch.branchId);

  const member = await prisma.member.upsert({
    where:  { userId: memberUser.userId },
    create: {
      memberNo,
      userId:               memberUser.userId,
      registrationBranchId: branch.branchId,
      fullName:             "Budi Santoso",
      phone:                "081234567890",
      voucherCount:         7,
      isConsentToPhoto:     true,
    },
    update: {},
  });
  console.log(`  ✅ Member: ${member.memberNo} — ${member.fullName}`);

  // 3. MemberPackage (ACTIVE)
  let memberPackage = await prisma.memberPackage.findFirst({
    where: { memberId: member.memberId },
  });
  if (!memberPackage) {
    memberPackage = await prisma.memberPackage.create({
      data: {
        memberId:         member.memberId,
        branchId:         branch.branchId,
        packagePricingId: packagePricing.packagePricingId,
        packageType:      PackageType.BASIC,
        packageName:      packagePricing.packageName,
        totalSessions:    7,
        usedSessions:     2,
        originalPrice:    1_500_000,
        discountPercent:  0,
        discountAmount:   0,
        finalPrice:       1_500_000,
        status:           MemberPackageStatus.ACTIVE,
        paidAt:           new Date("2026-04-01"),
        verifiedBy:       superAdmin.userId,
        verifiedAt:       new Date("2026-04-01"),
        activatedAt:      new Date("2026-04-01"),
      },
    });
  }
  console.log(`  ✅ MemberPackage: ${memberPackage.packageName} (${memberPackage.status})`);

  // 4. Encounter — filter via memberPackageId (Encounter tidak punya field notes)
  let encounter = await prisma.encounter.findFirst({
    where: { memberPackageId: memberPackage.memberPackageId },
  });
  if (!encounter) {
    encounter = await prisma.encounter.create({
      data: {
        memberId:        member.memberId,
        doctorId:        doctor.userId,
        branchId:        branch.branchId,
        memberPackageId: memberPackage.memberPackageId,
        type:            EncounterType.TREATMENT,
        status:          EncounterStatus.ONGOING,
        treatmentDate:   new Date("2026-04-01"),
      },
    });
  }
  console.log(`  ✅ Encounter: ${encounter.type} (${encounter.status})`);

  // 5. Session 1 — COMPLETED + 10 tanda vital
  let session1 = await prisma.treatmentSession.findFirst({
    where: { encounterId: encounter.encounterId, infusKe: 1 },
  });
  if (!session1) {
    session1 = await prisma.treatmentSession.create({
      data: {
        encounterId:   encounter.encounterId,
        nurseId:       nurse.userId,
        pelaksanaan:   PelaksanaanType.KLINIK,
        infusKe:       1,
        treatmentDate: new Date("2026-04-01T09:00:00Z"),
        startedAt:     new Date("2026-04-01T09:10:00Z"),
        completedAt:   new Date("2026-04-01T11:00:00Z"),
        status:        SessionStatus.COMPLETED,
        berhasilInfus: true,
      },
    });
  }

  const vitalSignsData: {
    pencatatan: VitalSignType;
    waktuCatat: VitalSignTiming;
    hasil:      number;
  }[] = [
    { pencatatan: "SISTOL",   waktuCatat: "SEBELUM", hasil: 148 },
    { pencatatan: "SISTOL",   waktuCatat: "SESUDAH", hasil: 128 },
    { pencatatan: "DIASTOL",  waktuCatat: "SEBELUM", hasil: 92  },
    { pencatatan: "DIASTOL",  waktuCatat: "SESUDAH", hasil: 82  },
    { pencatatan: "SATURASI", waktuCatat: "SEBELUM", hasil: 96  },
    { pencatatan: "SATURASI", waktuCatat: "SESUDAH", hasil: 99  },
    { pencatatan: "HR",       waktuCatat: "SEBELUM", hasil: 90  },
    { pencatatan: "HR",       waktuCatat: "SESUDAH", hasil: 72  },
    { pencatatan: "PI",       waktuCatat: "SEBELUM", hasil: 1.2 },
    { pencatatan: "PI",       waktuCatat: "SESUDAH", hasil: 2.8 },
  ];

  for (const vs of vitalSignsData) {
    await prisma.sessionVitalSign.upsert({
      where: {
        treatmentSessionId_pencatatan_waktuCatat: {
          treatmentSessionId: session1.treatmentSessionId,
          pencatatan:         vs.pencatatan,
          waktuCatat:         vs.waktuCatat,
        },
      },
      create: { treatmentSessionId: session1.treatmentSessionId, ...vs },
      update: { hasil: vs.hasil },
    });
  }
  console.log(`  ✅ Session 1 (COMPLETED) — ${vitalSignsData.length} tanda vital`);

  // 6. Session 2 — IN_PROGRESS, belum ada tanda vital
  let session2 = await prisma.treatmentSession.findFirst({
    where: { encounterId: encounter.encounterId, infusKe: 2 },
  });
  if (!session2) {
    session2 = await prisma.treatmentSession.create({
      data: {
        encounterId:   encounter.encounterId,
        nurseId:       nurse.userId,
        pelaksanaan:   PelaksanaanType.KLINIK,
        infusKe:       2,
        treatmentDate: new Date("2026-04-08T09:00:00Z"),
        startedAt:     new Date("2026-04-08T09:05:00Z"),
        status:        SessionStatus.IN_PROGRESS,
      },
    });
  }
  console.log(`  ✅ Session 2 (IN_PROGRESS) — 0 tanda vital`);

  console.log("\n  📋 Test IDs (Sprint 2):");
  console.log(`  SESSION_1_ID = ${session1.treatmentSessionId}`);
  console.log(`  SESSION_2_ID = ${session2.treatmentSessionId}`);

  // Return data yang dibutuhkan Sprint 3
  return { branch, nurse, doctor, superAdmin, member, memberPackage, encounter, session1, session2 };
}

// ─── Sprint 3 ─────────────────────────────────────────────────────────────────

// Helper: safe upsert MasterProduct (name bukan @@unique di schema)
const findOrCreateMasterProduct = async (data: {
  name: string;
  category: InventoryCategory;
  unit: string;
}): Promise<string> => {
  const existing = await prisma.masterProduct.findFirst({ where: { name: data.name } });
  if (existing) return existing.masterProductId;
  const created = await prisma.masterProduct.create({ data: { ...data, isActive: true } });
  return created.masterProductId;
};

async function seedSprint3(sprint2Data: Awaited<ReturnType<typeof seedSprint2>>) {
  console.log("\n📦 Seeding Sprint 3 — Infus Aktual...");

  const { branch, nurse, doctor, session1, session2 } = sprint2Data;

  // ── 1. MasterProducts ──────────────────────────────────────────────────────
  console.log("  📦 Seeding MasterProducts...");

  const PRODUCTS: Array<{ name: string; category: InventoryCategory; unit: string }> = [
    { name: "IFA Mg", category: InventoryCategory.MEDICINE,   unit: "mg" },
    { name: "HHO",    category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "H2",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "NO",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "GASO",   category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "O2",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "O3",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "EDTA",   category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "MB",     category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "H2S",    category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "KCL",    category: InventoryCategory.MEDICINE,   unit: "ml" },
    { name: "NaCl",   category: InventoryCategory.CONSUMABLE, unit: "ml" },
  ];

  const masterProductMap: Record<string, string> = {};
  for (const p of PRODUCTS) {
    masterProductMap[p.name] = await findOrCreateMasterProduct(p);
    console.log(`    ✅ MasterProduct: ${p.name}`);
  }

  // ── 2. InventoryItems + stok awal ──────────────────────────────────────────
  console.log("  📦 Seeding InventoryItems...");

  const INITIAL_STOCK: Record<string, number> = {
    "IFA Mg": 5000, "HHO": 2000, "H2":   2000, "NO":   1000,
    "GASO":   1000, "O2":  3000, "O3":   1000, "EDTA": 1000,
    "MB":      500, "H2S":  500, "KCL":   800, "NaCl": 10000,
  };

  for (const [name, stock] of Object.entries(INITIAL_STOCK)) {
    const masterProductId = masterProductMap[name];
    await prisma.inventoryItem.upsert({
      where:  { masterProductId_branchId: { masterProductId, branchId: branch.branchId } },
      create: { masterProductId, branchId: branch.branchId, stock, minThreshold: 100, isActive: true },
      update: {},
    });
  }
  console.log(`    ✅ ${Object.keys(INITIAL_STOCK).length} InventoryItems`);

  // ── 3. SessionTherapyPlan — Session 1 (plan sesuai aktual) ─────────────────
  await prisma.sessionTherapyPlan.upsert({
    where:  { treatmentSessionId: session1.treatmentSessionId },
    create: {
      treatmentSessionId: session1.treatmentSessionId,
      plannedBy:          doctor.userId,
      ifaMg:    200, hhoMl:   150, h2Ml:   100, noMl:    80,
      gasoMl:    60, o2Ml:    200, o3Ml:    50, edtaMl:  30,
      mbMl:      10, h2sMl:    20, kclMl:   15, jmlNbMl: 500,
      keterangan: "Sesi pertama — dosis standar",
    },
    update: {},
  });
  console.log(`  ✅ SessionTherapyPlan Session 1`);

  // ── 4. InfusionExecution — Session 1 (COMPLETED, tidak ada deviasi) ────────
  // Reload session1 dengan include infusionExecution
  const session1Full = await prisma.treatmentSession.findUniqueOrThrow({
    where:   { treatmentSessionId: session1.treatmentSessionId },
    include: { infusionExecution: true },
  });

  if (!session1Full.infusionExecution) {
    await prisma.infusionExecution.create({
      data: {
        treatmentSessionId:    session1.treatmentSessionId,
        filledBy:              nurse.userId,
        ifaMgActual:   200,  hhoMlActual:   150, h2MlActual:   100,
        noMlActual:     80,  gasoMlActual:   60, o2MlActual:   200,
        o3MlActual:     50,  edtaMlActual:   30, mbMlActual:    10,
        h2sMlActual:    20,  kclMlActual:    15, jmlNbMlActual: 500,
        jenisBotol:           JenisBotol.IFA,
        jenisCairan:          "NaCl 0.9%",
        volumeCarrierMl:       500,
        jumlahPenggunaanJarum: 2,
        tglProduksiCairan:    new Date("2026-04-01"),
        keterangan:           "Pelaksanaan berjalan lancar",
        deviationNote:        null,
      },
    });
    console.log(`  ✅ InfusionExecution Session 1 (no deviation)`);

    // StockMutation — auto-deduct untuk Session 1
    const DEDUCTIONS_S1: Array<{ name: string; qty: number }> = [
      { name: "IFA Mg", qty: 200 }, { name: "HHO",  qty: 150 },
      { name: "H2",     qty: 100 }, { name: "NO",    qty:  80 },
      { name: "GASO",   qty:  60 }, { name: "O2",    qty: 200 },
      { name: "O3",     qty:  50 }, { name: "EDTA",  qty:  30 },
      { name: "MB",     qty:  10 }, { name: "H2S",   qty:  20 },
      { name: "KCL",    qty:  15 }, { name: "NaCl",  qty: 500 },
    ];

    for (const { name, qty } of DEDUCTIONS_S1) {
      const masterProductId = masterProductMap[name];
      const item = await prisma.inventoryItem.findUnique({
        where: { masterProductId_branchId: { masterProductId, branchId: branch.branchId } },
      });
      if (!item) continue;
      const stockBefore = item.stock;
      const stockAfter  = stockBefore - qty;
      await prisma.inventoryItem.update({
        where: { inventoryItemId: item.inventoryItemId },
        data:  { stock: stockAfter },
      });
      await prisma.stockMutation.create({
        data: {
          inventoryItemId: item.inventoryItemId,
          branchId:        branch.branchId,
          type:            MutationType.USED,
          quantity:        -qty,
          stockBefore,
          stockAfter,
          createdBy:       nurse.userId,
          notes:           `[SEED_S3] Auto-deduct sesi infus ${session1.treatmentSessionId} (${name})`,
        },
      });
    }
    console.log(`  ✅ 12 StockMutations (USED) untuk Session 1`);
  } else {
    console.log(`  ⏭️  InfusionExecution Session 1 sudah ada — skip`);
  }

  // ── 5. SessionTherapyPlan — Session 2 (dosis ditingkatkan) ─────────────────
  await prisma.sessionTherapyPlan.upsert({
    where:  { treatmentSessionId: session2.treatmentSessionId },
    create: {
      treatmentSessionId: session2.treatmentSessionId,
      plannedBy:          doctor.userId,
      ifaMg:    250, hhoMl:   180, h2Ml:   120, noMl:   100,
      gasoMl:    80, o2Ml:    220, o3Ml:    60, edtaMl:  40,
      mbMl:      15, h2sMl:    25, kclMl:   20, jmlNbMl: 500,
      keterangan: "Sesi kedua — dosis ditingkatkan",
    },
    update: {},
  });
  console.log(`  ✅ SessionTherapyPlan Session 2 (InfusionExecution belum ada — untuk test POST)`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n  📋 Test IDs (Sprint 3):");
  console.log(`  SESSION_1_ID = ${session1.treatmentSessionId}  ← COMPLETED + InfusionExecution + TherapyPlan`);
  console.log(`  SESSION_2_ID = ${session2.treatmentSessionId}  ← IN_PROGRESS + TherapyPlan, belum InfusionExecution`);
  console.log(`  BRANCH_ID    = ${branch.branchId}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Starting RAHO Seed...\n");

  await seedRoles();
  await seedDefaultBranch();
  await seedSuperAdmin();
  await seedTestUsers();

  const sprint2Data = await seedSprint2();
  await seedSprint3(sprint2Data);

  console.log("\n✅ Seeding selesai!\n");
  console.log("📋 Akun yang tersedia:");
  console.log("  superadmin@raho.id   — Admin@RAHO2024!");
  console.log("  manager@raho.id      — Test@1234!");
  console.log("  admcabang@raho.id    — Test@1234!");
  console.log("  admlayn@raho.id      — Test@1234!");
  console.log("  dokter@raho.id       — Test@1234!");
  console.log("  nakes@raho.id        — Test@1234!");
  console.log("  member.test@raho.id  — Member@Test123!");
}

main()
  .catch((e) => { console.error("❌ Seed gagal:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());